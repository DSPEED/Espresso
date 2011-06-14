/*!
 * task_analyze.js
 *
 * Copyright 2011, Panacoda GmbH.  All rights reserved.
 * This file is licensed under the MIT license.
 *
 * @author tv
 */

JSLINT = require('../lib/jslint').JSLINT;

/**
 * @class
 * Analyze framework files and put the results into the analysis-property.
 *
 * @extends Task
 */
Task = exports.Task = function () {
  this.name = 'analyze';
};

Task.prototype = new (require('./task').Task)();

Task.prototype.duty = function (framework, callback) {
  var log = function () {
    framework.app.log.apply(framework.app, arguments);
  };

  framework.files.forEach(function (file) {
    if (file.isJavaScript()) {
      file.analysis = {
        definitions: {},
        references: {}
      };

      var result = JSLINT(file.content.toString()); // TODO check result?

      var T = deep_copy(JSLINT.tree); // TODO store ast in analysis?

      var the_relevant_parts = ['M', 'm_require', framework.app.name];

      // collect <M-REF> X.y
      walk(T,
          function (T) {
            return (T.value === '.' &&
                    T.arity === 'infix' &&
                    Object.keys(T.first).length === 1 && 'value' in T.first &&
                    the_relevant_parts.indexOf(T.first.value) >= 0 &&
                    Object.keys(T.second).length === 1 && 'value' in T.second);
          },
          function (T) {
            T.ref = [T.first.value, T.second.value].join('.');
            T.value = '<M-REF>';
            file.analysis.references[T.ref] = true;
          });                      
      // collect <M-REF> X
      walk(T,
          function (T) {
            return (Object.keys(T).length === 1 && 'value' in T &&
                    the_relevant_parts.indexOf(T.value) >= 0);
          },
          function (T) {
            T.ref = T.value;
            T.value = '<M-REF>';
            file.analysis.references[T.ref] = true;
          });
      // collect <M-DEF> 
      walk(T,
          function (T) {
            return (T.value === '=' &&
                    T.arity === 'infix' &&
                    T.first.value === '<M-REF>');
          },
          function (T) {
            T.def = T.first.ref;
            T.value = '<M-DEF>';
            file.analysis.definitions[T.def] = true;
          });

      file.analysis.references = Object.keys(file.analysis.references);
      file.analysis.definitions = Object.keys(file.analysis.definitions);
    };
  });
  
  framework.analysis = true;
  log(1, 'analyzed', framework.name);

  return callback(framework);
};

/**
 * Properties of the AST generated by JSLint, that should be recognized by
 * {@link deep_copy} and {@link walk}.
 */
The_relevant_parts = [
  'value',  'arity', 'name',  'first',
  'second', 'third', 'block', 'else'
];

/**
 * Copy a tree.  Only {@link The_relevant_parts} get copied.
 * @param {tree}
 * @returns {tree} fresh copy of the tree
 */
function deep_copy(T) {
  return JSON.parse(JSON.stringify(T, The_relevant_parts));
};

/**
 * Walk a tree and execute a function whenever the predicate returns true.
 * The function can be used to modify the tree (in place).
 * 
 * @param {tree}
 * @param {predicate}
 * @param {function}
 */
function walk(T, p, f) {
  if (typeof T === 'object') {
    if (T instanceof Array) {
      T.forEach(function (T) {
        walk(T, p, f);
      });
    } else if (p(T)) {
      f(T);
    } else {
      walk_children(T, p, f);
    };
  };
};

function walk_children(T, p, f) {
  The_relevant_parts.forEach(function (part) {
    walk(T[part], p, f);
  });
};

