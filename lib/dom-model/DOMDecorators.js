/*
Copyright 2018 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import DOMNode from './DOMNode';
import EmbedNode from './EmbedNode'

var _idCount = 0;

function makeDecorator(callback) {
    return function (...args) {
        if (args.length === 3 && typeof args[2] === "object") {
            return callback().apply(this, args)
        } else {
            return callback(...args);
        }
    }
}

function makeDOMNode(target, selector) {
    const dataNode = new DOMNode();
    dataNode.node = target;
    dataNode.selector = selector;
    target._reactComponentDataNode = dataNode;
    return dataNode;
}

function findCommentNode(element, selector) {
	for(let i = 0; i < element.childNodes.length; i++) {
		let node = element.childNodes[i];
		if( node.nodeType === 8
			&& node._reactComponentDataNode
			&& node._reactComponentDataNode.selector === selector) {
			return node;
		}
	}
}

function queryChildren(element, selector, all = false) {
	if (typeof selector !== 'string') {
		console.warn('Query selector must be string!');
		return;
	}
	let id = element.id,
		guid = element.id = id || 'query_children_' + _idCount++,
		attr = '#' + guid + ' > ',
		scopedSelector = attr + (selector + '').replace(',', ',' + attr, 'g');
	let result = all ? element.querySelectorAll(scopedSelector) : element.querySelector(scopedSelector);
	if (!id) {
		element.removeAttribute('id');
	}
	return result;
}

/**
 * Parses the element and returns the innerText
 * 
 * @returns {function} - the decorator function
 */
let byContentVal = makeDecorator(function() {
    return function (target, key, descriptor) {
        if (target.addProperty) {
			descriptor.writable = true;
            target.addProperty(key, (element) => {
                return element && element.innerText;
            });
        }
    }
});


/**
 * Parses the element and returns the value of the provided attribute
 *
 * @param   {[String} attrName - the attribute we are parsing
 * @returns {function} - the decorator function
 */
let byAttrVal = makeDecorator(function(attrName) {
    return function (target, key, descriptor) {
        descriptor.writable = true;
        let attributeName = attrName || key;
        target.addAttribute(attributeName);
        target.addAttributeKey(attributeName, key);
        let defaultValue;
        if (descriptor.initializer) {
            defaultValue = descriptor.initializer();
        }

        if (target.addProperty) {
            target.addProperty(key, (element) => {
                return element && (element.hasAttribute(attributeName)  
                        ? element.getAttribute(attributeName) : defaultValue);
            })
        }
    }
});

/**
 * Parses the element and returns the JSON parse value of the provided attribute
 *
 * @param   {[String} attrName - the attribute we are parsing
 * @returns {function} - the decorator function
 */
let byJsonAttrVal = makeDecorator(function(attrName) {
    return function (target, key, descriptor) {
        descriptor.writable = true;
        let attributeName = attrName || key;
        target.addAttribute(attributeName);
        target.addAttributeKey(attributeName, key);
        let defaultValue;
        if (descriptor.initializer) {
            defaultValue = descriptor.initializer();
        }
        if (target.addProperty) {
            target.addProperty(key, (element) => {
                return element && (element.hasAttribute(attributeName)  
                        ? JSON.parse(element.getAttribute(attributeName)) : defaultValue);
            })
        }
    }
});


    /**
    * Creates a property that sets the value based on the existance of an attribute
    * @param {String} attrName - the name of the attribute
    * @param {Object} [config = null] - the configuration for the property
    */
let byBooleanAttrVal = makeDecorator(function(attrName) {
    return function (target, key, descriptor) {
        descriptor.writable = true;
        let attributeName = attrName || key;
        target.addAttribute(attributeName);
        target.addAttributeKey(attributeName, key);
        let defaultValue;
        if (descriptor.initializer) {
            defaultValue = descriptor.initializer();
        }
        if (target.addProperty) {
            target.addProperty(key, (element) => {
                return element && (element.hasAttribute(attributeName));
            });
        };
    }
});

/**
 * Attaches a content observer to the child, and registers the observer on the target
 *
 * @private
 * @param   {DOMModel} target - the dom model we are attaching to
 * @param   {String} key - the name of the property we are currently on
 * @param   {HTMLElement} element -  the element that we are parsing 
 * @param   {HTMLElement} child - the element we are observing
 * @param   {Object} observeOptions - the options passed to observe method
 * @param   {function} valueFn - the function to return the value of the child
 */
function attachContentListObserver(target, key, element, valueFn, observeOptions ) {
    if (element && !element._isObserved) {
        const observer = new MutationObserver(() => { 
            element.dispatchEvent(new CustomEvent('_updateModel', {
                detail: [{
                    propertyName: key,
                    value: valueFn && valueFn(element)
                }]
            }))
        });
        element._isObserved = true;
        observer.observe(element, observeOptions || { attributes: false, characterData: true,
            childList: true, subtree:true });
        if (target.addObserver) {
            target.addObserver(observer);
        }   
    }
}

/**
 * Attaches a content observer to the child, and registers the observer on the target
 *
 * @private
 * @param   {DOMModel} target - the dom model we are attaching to
 * @param   {String} key - the name of the property we are currently on
 * @param   {HTMLElement} element -  the element that we are parsing 
 * @param   {HTMLElement} child - the element we are observing
 * @param   {function} valueFn - the function to return the value of the child
 */
function attachContentObserver(target, key, element, child, valueFn) {
    if (child && !child._isObserved) {
        const observer = new MutationObserver(() => { 
            element.dispatchEvent(new CustomEvent('_updateModel', {
                detail: [{
                    propertyName: key,
                    value: valueFn && valueFn()
                }]
            }))
        });
        child._isObserved = true;
        observer.observe(child.childNodes[0], { characterData: true, childList: false });
        observer.observe(child, { characterData: false, childList: true });
        if (target.addObserver) {
            target.addObserver(observer);
        }   
    }
}

/**
 * Adds to the model a property that returns a react component that, when 
 * rendered, will produce the node matched by the given selector. The 
 * React component will "steal" the DOM node from it's original parent.
 * If the React component is later removed from the render tree, the DOM
 * node that was stolen will be replaced in its original parent.
 * 
 * @param {String} selector - the selector for the child to turn into a React component
 * 
 * @returns {function} - the decorator function
*/
let byContent = makeDecorator(function(selector) {
    return function (target, key, descriptor) {
        descriptor.writable = true;
        if (target.addProperty) {
            target.addProperty(key, (element) => {
				if (element && (element instanceof HTMLElement)) {
					let node = null;

					let valueFn = () => {
						if (!node) {
							let child = queryChildren(element, selector);
							if (child) {
								node = <EmbedNode item={ makeDOMNode(child, selector) }/>;
							}
						}
						return node;
					}
					let result = valueFn();
					if (!result) {
						// We could not match the selector. That is possibly because 
						// a rendering engine has not filled in the children yet.
						// Watch for DOM mutations that add a matching element
						attachContentObserver(target, key, element, element, valueFn);
					}
					return valueFn();
				}
			});
        }
    }
});

/**
 * Parses the element and returns the innerText of the child element with the provided name
 *
 * @param   {String} childName - the child element name
 * @returns {function} - the decorator function
 */
let byChildContentVal = makeDecorator(function(childName) {
    return function (target, key, descriptor) {
        descriptor.writable = true;
        if (target.addProperty) {
            target.addProperty(key, (element) => {
                if (element && (element instanceof HTMLElement)) {
                    let child = element.querySelector(childName);
                    let valueFn = () => child && child.innerText;
                    attachContentObserver(target, key, element, child, valueFn);
                    return valueFn();
                }
            })
        }
    }
});

/**
* Creates a property with parsed by the provided model
* @param {DOMModel} refType - the DOMModel class to parse with
*/

let byModel = makeDecorator(function(refType) {
    return function (target, key, descriptor) {
        descriptor.writable = true;
        if (target.addProperty) {
            target.addProperty(key, (element) => {
                if (element && (element instanceof HTMLElement)) {
                    let value = new refType();
                    value.fromDOM(element);
                    return value;
                }
            });

        };
    };
});

/**
* Creates a property with an array of values based on a child exportable model
* @param {String} selector - the selector for the children
* @param {DOMModel} refType - the DOMExportable class of the child model
*/
let byChildrenRefArray = makeDecorator(function(selector, refType) {
    return function (target, key, descriptor) {
        descriptor.writable = true;
        if (target.addProperty) {
            target.addProperty(key, (element) => {
                let valueFn = function(domElement) {
                    let result = [];
                    if (domElement && (domElement instanceof HTMLElement)) {
                        let children = domElement.querySelectorAll(selector);

                        for (let i = 0, l = children.length; i < l; ++i) {
                            let value = new refType();
                            value.fromDOM(children[i]);
                            result.push(value);
                        }
                    }
                    return result;
                }

                attachContentListObserver(target, key, element, valueFn,{ attributes: true, characterData: true,
                    childList: true, subtree:true });
                return valueFn(element);
            })
        }
    }
});

/**
* Creates a property with an array of values parsed by the map of node name and DOMModel
* @param {Object} childrenMap - a map between a node name string and a DOMModel
* @returns {function} - the decorator function
*/
let byChildrenTypeArray = makeDecorator(function(childrenMap) {
    return function (target, key, descriptor) {
        descriptor.writable = true;
        if (target.addProperty) {
            target.addProperty(key, (element) => {
                let valueFn = function(domElement, childrenMap) {
                    var result = [];
                    if (domElement && (domElement instanceof HTMLElement)) {
                        let children = domElement.children;
                        for(let i = 0; i < children.length; ++i) {
                            let child = children[i];
                            let refType = childrenMap[child.nodeName.toLowerCase()];
                            if (refType) {
                                let value = new refType;
                                value.fromDOM(child);
                                result.push(value);
                            }
                        }
                    }
                    return result;
                }
                let observerFn = (domElement) => {
                    return valueFn(domElement, childrenMap )
                }
                // TODO optimize this so we don't actually observe everything
                // One way would be one observer per element and one observer on the parent to disconnect when removed
                attachContentListObserver(target, key, element, observerFn);
                return valueFn(element, childrenMap);
            })
        }
    }
});

/**
 * Creates a property with the value returned by parsing the elements returned by the selector with the given DOMModel
 *
 * @param   {String} selector - the selector that will be ran against the element, and use the first result of the query.
 * @returns {function} - the decorator function
 */
let byChildRef = makeDecorator(function(selector, refType) {
    return function (target, key, descriptor) {
        descriptor.writable = true;
        if (target.addProperty) {
            target.addProperty(key, (element) => {
                let valueFn = (domElement) => {
                    if (domElement && (domElement instanceof HTMLElement)) {
                        let child = domElement.querySelector(selector);
                        if (child) {
                            let value = new refType();
                            value.fromDOM(child);
                            return value;
                        }
                    }
                }
                return valueFn(element);
            })
        }
    }
});

/**
 * Creates a property based on a webcomponent model of a child
 * @param {String} selector - the selector used
 * @returns {function} - the decorator function
 */
let byChildModelVal = makeDecorator(function(selector) {
    return function (target, key, descriptor) {
        descriptor.writable = true;
        if (target.addProperty) {
            target.addProperty(key, (element) => {
                if (element && (element instanceof HTMLElement)) {
                    let child = element.querySelector(selector);
                    if (child && child._generateModel && typeof child._generateModel === "function") {
                        // This will trigger toDOM on the component further
                        return child._generateModel();
                    }
                }
            });
        }
    }
});
/**
 * Registers an event on the model
 *
 * @param   {String} eventName - the name of the event
 * @returns {function} - the decorator function
 */
let registerEvent = makeDecorator(function(eventName) {
    return function (target, key, descriptor) {
        if (target.addEvent) {
            target.addEvent(eventName || key);
        }
    }
});

export { 
    byAttrVal,
    byBooleanAttrVal,
	byContentVal,
	byContent,
    byChildContentVal,
    byJsonAttrVal,
    byModel,
    byChildrenRefArray,
    byChildrenTypeArray,
    byChildRef,
    registerEvent,
    byChildModelVal
};