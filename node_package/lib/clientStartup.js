'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

exports.reactOnRailsPageLoaded = reactOnRailsPageLoaded;
exports.clientStartup = clientStartup;

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _createReactElement = require('./createReactElement');

var _createReactElement2 = _interopRequireDefault(_createReactElement);

var _isCreateReactElementResultNonReactComponent = require('./isCreateReactElementResultNonReactComponent');

var _isCreateReactElementResultNonReactComponent2 = _interopRequireDefault(_isCreateReactElementResultNonReactComponent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var REACT_ON_RAILS_STORE_ATTRIBUTE = 'data-js-react-on-rails-store'; /* global ReactOnRails Turbolinks */

function findContext() {
  if (typeof window.ReactOnRails !== 'undefined') {
    return window;
  } else if (typeof ReactOnRails !== 'undefined') {
    return global;
  }

  throw new Error('ReactOnRails is undefined in both global and window namespaces.\n  ');
}

function debugTurbolinks() {
  if (!window) {
    return;
  }

  var context = findContext();
  if (context.ReactOnRails.option('traceTurbolinks')) {
    var _console;

    for (var _len = arguments.length, msg = Array(_len), _key = 0; _key < _len; _key++) {
      msg[_key] = arguments[_key];
    }

    (_console = console).log.apply(_console, ['TURBO:'].concat(msg));
  }
}

function turbolinksInstalled() {
  return typeof Turbolinks !== 'undefined';
}

function forEach(fn, className, railsContext) {
  var els = document.getElementsByClassName(className);
  for (var i = 0; i < els.length; i += 1) {
    fn(els[i], railsContext);
  }
}

function forEachByAttribute(fn, attributeName, railsContext) {
  var els = document.querySelectorAll('[' + attributeName + ']');
  for (var i = 0; i < els.length; i += 1) {
    fn(els[i], railsContext);
  }
}

function forEachComponent(fn, railsContext) {
  forEach(fn, 'js-react-on-rails-component', railsContext);
}

function initializeStore(el, railsContext) {
  var context = findContext();
  var name = el.getAttribute(REACT_ON_RAILS_STORE_ATTRIBUTE);
  var props = JSON.parse(el.textContent);
  var storeGenerator = context.ReactOnRails.getStoreGenerator(name);
  var store = storeGenerator(props, railsContext);
  context.ReactOnRails.setStore(name, store);
}

function forEachStore(railsContext) {
  forEachByAttribute(initializeStore, REACT_ON_RAILS_STORE_ATTRIBUTE, railsContext);
}

function turbolinksVersion5() {
  return typeof Turbolinks.controller !== 'undefined';
}

function turbolinksSupported() {
  return Turbolinks.supported;
}

function delegateToRenderer(componentObj, props, railsContext, domNodeId, trace) {
  var name = componentObj.name,
      component = componentObj.component,
      isRenderer = componentObj.isRenderer;


  if (isRenderer) {
    if (trace) {
      console.log('DELEGATING TO RENDERER ' + name + ' for dom node with id: ' + domNodeId + ' with props, railsContext:', props, railsContext);
    }

    component(props, railsContext, domNodeId);
    return true;
  }

  return false;
}

function domNodeIdForEl(el) {
  return el.getAttribute('data-dom-id');
}

/**
 * Used for client rendering by ReactOnRails. Either calls ReactDOM.hydrate, ReactDOM.render, or
 * delegates to a renderer registered by the user.
 * @param el
 */
function render(el, railsContext) {
  var context = findContext();
  // This must match lib/react_on_rails/helper.rb
  var name = el.getAttribute('data-component-name');
  var domNodeId = domNodeIdForEl(el);
  var props = JSON.parse(el.textContent);
  var trace = el.getAttribute('data-trace');

  try {
    var domNode = document.getElementById(domNodeId);
    if (domNode) {
      var componentObj = context.ReactOnRails.getComponent(name);
      if (delegateToRenderer(componentObj, props, railsContext, domNodeId, trace)) {
        return;
      }

      // Hydrate if available and was server rendered
      var shouldHydrate = !!_reactDom2.default.hydrate && !!domNode.innerHTML;

      var reactElementOrRouterResult = (0, _createReactElement2.default)({
        componentObj: componentObj,
        props: props,
        domNodeId: domNodeId,
        trace: trace,
        railsContext: railsContext,
        shouldHydrate: shouldHydrate
      });

      if ((0, _isCreateReactElementResultNonReactComponent2.default)(reactElementOrRouterResult)) {
        throw new Error('You returned a server side type of react-router error: ' + (0, _stringify2.default)(reactElementOrRouterResult) + '\nYou should return a React.Component always for the client side entry point.');
      } else if (shouldHydrate) {
        _reactDom2.default.hydrate(reactElementOrRouterResult, domNode);
      } else {
        _reactDom2.default.render(reactElementOrRouterResult, domNode);
      }
    }
  } catch (e) {
    e.message = 'ReactOnRails encountered an error while rendering component: ' + name + '.\n' + ('Original message: ' + e.message);
    throw e;
  }
}

function parseRailsContext() {
  var el = document.getElementById('js-react-on-rails-context');
  if (el) {
    return JSON.parse(el.textContent);
  }

  return null;
}

function reactOnRailsPageLoaded() {
  debugTurbolinks('reactOnRailsPageLoaded');

  var railsContext = parseRailsContext();
  forEachStore(railsContext);
  forEachComponent(render, railsContext);
}

function unmount(el) {
  var domNodeId = domNodeIdForEl(el);
  var domNode = document.getElementById(domNodeId);
  try {
    _reactDom2.default.unmountComponentAtNode(domNode);
  } catch (e) {
    console.info('Caught error calling unmountComponentAtNode: ' + e.message + ' for domNode', domNode, e);
  }
}

function reactOnRailsPageUnloaded() {
  debugTurbolinks('reactOnRailsPageUnloaded');
  forEachComponent(unmount);
}

function clientStartup(context) {
  var document = context.document;

  // Check if server rendering
  if (!document) {
    return;
  }

  // Tried with a file local variable, but the install handler gets called twice.
  // eslint-disable-next-line no-underscore-dangle
  if (context.__REACT_ON_RAILS_EVENT_HANDLERS_RAN_ONCE__) {
    return;
  }

  // eslint-disable-next-line no-underscore-dangle, no-param-reassign
  context.__REACT_ON_RAILS_EVENT_HANDLERS_RAN_ONCE__ = true;

  debugTurbolinks('Adding DOMContentLoaded event to install event listeners.');

  window.setTimeout(function () {
    if (!turbolinksInstalled() || !turbolinksSupported()) {
      if (document.readyState === 'complete' || document.readyState !== 'loading' && !document.documentElement.doScroll) {
        debugTurbolinks('NOT USING TURBOLINKS: DOM is already loaded, calling reactOnRailsPageLoaded');

        reactOnRailsPageLoaded();
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          debugTurbolinks('NOT USING TURBOLINKS: DOMContentLoaded event, calling reactOnRailsPageLoaded');
          reactOnRailsPageLoaded();
        });
      }
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    // Install listeners when running on the client (browser).
    // We must do this check for turbolinks AFTER the document is loaded because we load the
    // Webpack bundles first.

    if (turbolinksInstalled() && turbolinksSupported()) {
      if (turbolinksVersion5()) {
        debugTurbolinks('USING TURBOLINKS 5: document added event listeners ' + 'turbolinks:before-render and turbolinks:render.');
        document.addEventListener('turbolinks:before-render', reactOnRailsPageUnloaded);
        document.addEventListener('turbolinks:render', reactOnRailsPageLoaded);
        reactOnRailsPageLoaded();
      } else {
        debugTurbolinks('USING TURBOLINKS 2: document added event listeners page:before-unload and ' + 'page:change.');
        document.addEventListener('page:before-unload', reactOnRailsPageUnloaded);
        document.addEventListener('page:change', reactOnRailsPageLoaded);
      }
    }
  });
}