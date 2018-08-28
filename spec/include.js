module.exports = {
  spec_dir  : "build",
  spec_files: [
    // "**/*.spec.js",    

    /* From source code */
    // "fromSOurceCode/MWork/__test__/index.spec.js"
    
    /* m */
    // "m/__test__/index.spec.js",

    /* m-tmp */
    // "m-tmp/__test__/mount.spec.js",
    // "m-tmp/__test__/mountTree.spec.js",
    // "m-tmp/__test__/mountTreeTwice.spec.js",

    /* m-reconciler */
    "m-reconciler/MUpdateQueue/__test__/index.spec.js",

  ],
  helpers                     : [],
  stopSpecOnExpectationFailure: false,
  random                      : false
}
