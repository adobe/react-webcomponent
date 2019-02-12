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

import React from 'react';
import ReactDOM from 'react-dom';

const _rootShadows = new WeakMap();
const _models = new WeakMap();

/**
 * Generates the model for a given CustomElement
 *
 * @param   {CustomElement} component - the component to parse
 * @returns {DOMModel} - the generated model
 */
function generateModel(component) {
    let model = _models.get(component);
    if (!model && component.constructor.domModel) {
        model = new component.constructor.domModel(component);
        model.fromDOM(component);
        _models.set(component, model);
    }
    return model;
}

/**
 * Generates the events for a CustomElement
 *
 * @param   {CustomElement} component - the component to parse the model fromDO
 * @returns {Object} - the events object
 */
function getEvents(component) {
    let eventsMap = {};
    let model = _models.get(component);
    if (model) {
        let events = model.events;
        events.forEach((eventName) => {
            let eventFn = eventName;
            if (!eventFn.startsWith('on')) {
                if (!/[A-Z]/.test(eventFn[0])) {
                    eventFn = eventFn[0].toUpperCase() + eventFn.substr(1);
                }
                eventFn = 'on' + eventFn;
            }
            eventsMap[eventFn] = function(event) {
                component.dispatchEvent(new CustomEvent(eventName, { 'detail': event.detail, bubbles: true }));
            }
        });
    }

    return eventsMap;
}

/**
 * Renders a CustomElement
 *
 * @param   {CustomElement} component the component to render
 */
function renderCustomElement(component) {
    const ReactComponent = component.constructor.ReactComponent;
    const model = generateModel(component);
    const properties = model.properties;
    const events = getEvents(component);
    const reactElem = React.createElement(ReactComponent, Object.assign(properties, events), null);
    ReactDOM.render(reactElem, _rootShadows.get(component), function() {
        component.__reactComp = this;
    });
}

export class CustomElement extends HTMLElement {
    connectedCallback() {
        let rootEl = this;
        switch(this.constructor.renderRoot) {
            case "container":
                rootEl = this.rootDiv = document.createElement("div");
                this.appendChild(rootEl);
                break;
            case "shadowRoot":
                rootEl = this.attachShadow({ mode: "closed" })
                break;
        }
        _rootShadows.set(this, rootEl);

        renderCustomElement(this);
        this.addEventListener('_updateModel', this._updateModel.bind(this));
    }

    _generateModel() {
        return generateModel(this);
    }

    _updateModel(event) {
        let model = _models.get(this);
        if (model) {
            let changedProperties = event.detail;
            changedProperties.forEach((property) => {
                model[property.propertyName] = property.value;
            });
        }
        renderCustomElement(this);
    }

    disconnectedCallback() {
		ReactDOM.unmountComponentAtNode(_rootShadows.get(this));
		if (this.rootDiv) {
			this.removeChild(this.rootDiv);
			delete this.rootDiv;
		}
        let model = _models.get(this);
        if (model) {
            model.destroy();
            _models.delete(this);
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        let model = _models.get(this);
        if (model) {
            let key = model.getAttributeKey(name);
            let property = model.getProperty(key);
            model[key] = property ? property.fromDOM(this) : newValue;
            renderCustomElement(this);
        }
    }
}

/**
 * Creates a CustomElement
 * @param {function} ReactComponent 
 * @param {DOMModel} Model 
 * @param {string} renderRoot 
 */
export function createCustomElement(ReactComponent, Model, renderRoot = "element") {
    class CustomCustomElement extends CustomElement {};
    CustomCustomElement.domModel = Model;
    CustomCustomElement.ReactComponent = ReactComponent;
    CustomCustomElement.renderRoot = renderRoot;
    if (Model) {
        CustomCustomElement.observedAttributes = Model.prototype.attributes;
    }
    return CustomCustomElement;
}
