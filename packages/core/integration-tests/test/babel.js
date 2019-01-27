const assert = require('assert');
const fs = require('@parcel/fs');
const path = require('path');
const {bundle, run, ncp, rimraf} = require('./utils');
const {mkdirp} = require('@parcel/fs');
const {symlinkSync} = require('fs');
const {ConfigProvider} = require('@parcel/core');

describe('babel', function() {
  it('should produce a basic JS bundle using Babel 6', async function() {
    let b = await bundle(
      __dirname + '/integration/babel-6-compatibility/index.js'
    );

    let output = await run(b);
    assert.equal(typeof output, 'object');
    assert.equal(typeof output.default, 'function');
    assert.equal(output.default(), 3);
  });

  it.skip('should auto install babel-core v6', async function() {
    let originalPkg = await fs.readFile(
      __dirname + '/integration/babel-6-autoinstall/package.json'
    );
    let b = await bundle(
      __dirname + '/integration/babel-6-autoinstall/index.js'
    );

    let output = await run(b);
    assert.equal(typeof output, 'object');
    assert.equal(typeof output.default, 'function');
    assert.equal(output.default(), 3);

    let pkg = await fs.readFile(
      __dirname + '/integration/babel-6-autoinstall/package.json'
    );
    assert(JSON.parse(pkg).devDependencies['babel-core']);
    await fs.writeFile(
      __dirname + '/integration/babel-6-autoinstall/package.json',
      originalPkg
    );
  });

  it.skip('should auto install @babel/core v7', async function() {
    let originalPkg = await fs.readFile(
      __dirname + '/integration/babel-7-autoinstall/package.json'
    );
    let b = await bundle(
      __dirname + '/integration/babel-7-autoinstall/index.js'
    );

    let output = await run(b);
    assert.equal(typeof output, 'object');
    assert.equal(typeof output.default, 'function');
    assert.equal(output.default(), 3);

    let pkg = await fs.readFile(
      __dirname + '/integration/babel-7-autoinstall/package.json'
    );
    assert(JSON.parse(pkg).devDependencies['@babel/core']);
    await fs.writeFile(
      __dirname + '/integration/babel-7-autoinstall/package.json',
      originalPkg
    );
  });

  it.skip('should auto install babel plugins', async function() {
    let originalPkg = await fs.readFile(
      __dirname + '/integration/babel-plugin-autoinstall/package.json'
    );
    let b = await bundle(
      __dirname + '/integration/babel-plugin-autoinstall/index.js'
    );

    let output = await run(b);
    assert.equal(typeof output, 'object');
    assert.equal(typeof output.default, 'function');
    assert.equal(output.default(), 3);

    let pkg = await fs.readFile(
      __dirname + '/integration/babel-plugin-autoinstall/package.json'
    );
    assert(JSON.parse(pkg).devDependencies['@babel/core']);
    assert(
      JSON.parse(pkg).devDependencies['@babel/plugin-proposal-class-properties']
    );
    await fs.writeFile(
      __dirname + '/integration/babel-plugin-autoinstall/package.json',
      originalPkg
    );
  });

  it('should support compiling with babel using .babelrc config', async function() {
    await bundle(path.join(__dirname, '/integration/babel/index.js'));

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(!file.includes('function Foo'));
    assert(!file.includes('function Bar'));
  });

  it.only('should use a custom babel config via ConfigProvider API', async function() {
    await bundle(path.join(__dirname, '/integration/babel/index.js'), {
      configProvider: new ConfigProvider({
        getConfig(sourcePath, configFileName) {
          console.log(sourcePath, configFileName);
          return {};
        }
      })
    });

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(!file.includes('function Foo'));
    assert(!file.includes('function Bar'));
  });

  it('should compile with babel with default engines if no config', async function() {
    await bundle(path.join(__dirname, '/integration/babel-default/index.js'));

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('function Foo'));
    assert(file.includes('function Bar'));
  });

  it('should support compiling with babel using browserlist', async function() {
    await bundle(
      path.join(__dirname, '/integration/babel-browserslist/index.js')
    );

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('function Foo'));
    assert(file.includes('function Bar'));
  });

  it('should support splitting babel-polyfill using browserlist', async function() {
    await bundle(path.join(__dirname, '/integration/babel-polyfill/index.js'));

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('async function'));
    assert(!file.includes('regenerator'));
  });

  it.skip('should support compiling with babel using browserslist for different environments', async function() {
    async function testBrowserListMultipleEnv(projectBasePath) {
      // Transpiled destructuring, like r = p.prop1, o = p.prop2, a = p.prop3;
      const prodRegExp = /\S+ ?= ?\S+\.prop1,\s*?\S+ ?= ?\S+\.prop2,\s*?\S+ ?= ?\S+\.prop3;/;
      // ES6 Destructuring, like in the source;
      const devRegExp = /const ?{\s*prop1(:.+)?,\s*prop2(:.+)?,\s*prop3(:.+)?\s*} ?= ?.*/;
      let file;
      // Dev build test
      await bundle(path.join(__dirname, projectBasePath, '/index.js'));
      file = await fs.readFile('dist/index.js', 'utf8');
      assert.equal(devRegExp.test(file), true);
      assert.equal(prodRegExp.test(file), false);
      // Prod build test
      await bundle(path.join(__dirname, projectBasePath, '/index.js'), {
        minify: false,
        production: true
      });
      file = await fs.readFile('dist/index.js', 'utf8');
      assert.equal(prodRegExp.test(file), true);
      assert.equal(devRegExp.test(file), false);
    }

    await testBrowserListMultipleEnv(
      '/integration/babel-browserslist-multiple-env'
    );
    await testBrowserListMultipleEnv(
      '/integration/babel-browserslist-multiple-env-as-string'
    );
  });

  it('should not compile node_modules by default', async function() {
    await bundle(
      path.join(__dirname, '/integration/babel-node-modules/index.js')
    );

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(/class \S+ \{\}/.test(file));
    assert(file.includes('function Bar'));
  });

  it('should compile node_modules if legacy browserify options are found', async function() {
    await bundle(
      path.join(
        __dirname,
        '/integration/babel-node-modules-browserify/index.js'
      )
    );

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('function Foo'));
    assert(file.includes('function Bar'));
  });

  it('should compile node_modules with browserslist to app target', async function() {
    await bundle(
      path.join(
        __dirname,
        '/integration/babel-node-modules-browserslist/index.js'
      )
    );

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('function Foo'));
    assert(file.includes('function Bar'));
  });

  it('should compile node_modules when symlinked with a source field in package.json', async function() {
    const inputDir = path.join(__dirname, '/input');
    await rimraf(inputDir);
    await mkdirp(path.join(inputDir, 'node_modules'));
    await ncp(
      path.join(path.join(__dirname, '/integration/babel-node-modules-source')),
      inputDir
    );

    // Create the symlink here to prevent cross platform and git issues
    symlinkSync(
      path.join(inputDir, 'packages/foo'),
      path.join(inputDir, 'node_modules/foo'),
      'dir'
    );

    await bundle(inputDir + '/index.js');

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('function Foo'));
    assert(file.includes('function Bar'));
  });

  it('should not compile node_modules with a source field in package.json when not symlinked', async function() {
    await bundle(
      path.join(
        __dirname,
        '/integration/babel-node-modules-source-unlinked/index.js'
      )
    );

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(!file.includes('function Foo'));
    assert(file.includes('function Bar'));
  });

  it('should support compiling JSX', async function() {
    await bundle(path.join(__dirname, '/integration/jsx/index.jsx'));

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('React.createElement("div"'));
  });

  it('should support compiling JSX in JS files with React dependency', async function() {
    await bundle(path.join(__dirname, '/integration/jsx-react/index.js'));

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('React.createElement("div"'));
  });

  it('should support compiling JSX in JS files with Preact dependency', async function() {
    await bundle(path.join(__dirname, '/integration/jsx-preact/index.js'));

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('h("div"'));
  });

  it('should support compiling JSX in JS files with Nerv dependency', async function() {
    await bundle(path.join(__dirname, '/integration/jsx-nervjs/index.js'));

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('Nerv.createElement("div"'));
  });

  it('should support compiling JSX in JS files with Hyperapp dependency', async function() {
    await bundle(path.join(__dirname, '/integration/jsx-hyperapp/index.js'));

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(file.includes('h("div"'));
  });

  it('should strip away flow types of node modules', async function() {
    let b = await bundle(
      path.join(__dirname, '/integration/babel-strip-flow-types/index.js')
    );

    let output = await run(b);
    assert.equal(typeof output, 'function');
    assert.equal(output(), 'hello world');

    let file = await fs.readFile('dist/index.js', 'utf8');
    assert(!file.includes('OptionsType'));
  });
});