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

export class DOMModel {
    /**
     * Registers this property on the model
     *
     * @param {String} name - the name of the property
     * @param {function} fromDOM - the method to convert from DOM to Model
     */
    addProperty(name, fromDOM) {
        if (!this._exportableProperties) {
            this._exportableProperties = [];
        }
        this._exportableProperties.push({
            name,
            fromDOM
        });
    }

    /**
     * Returns a property based on the name
     *
     * @param   {String} name - the name fo the property we are looking from
     * @returns {Object} - the registered property
     */
    getProperty(name) {
        return this._exportableProperties && this._exportableProperties.find((exportableProperty) => exportableProperty.name === name);
    }

    /**
     * Registeres an attribute
     *
     * @param {String} attrName - the attribute name
     */
    addAttribute(attrName) {
        if (!this._attributes) {
            this._attributes = [];
        }
        this._attributes.push(attrName);
    }

    /**
     * Adds a attribute key
     *
     * @param {String} attrName - the name of the attribute
     * @param {String} key - the key
     */
    addAttributeKey(attrName, key) {
        if (!this._attributeKeys) {
            this._attributeKeys = {};
        }
        this._attributeKeys[attrName] = key;
    }

    /**
     * Gets the key of an attribute
     *
     * @param   {String} attrName - the attribute name to look for
     * @returns {String} - the key of the attribute
     */
    getAttributeKey(attrName) {
        return this._attributeKeys && this._attributeKeys[attrName];
    }

    /**
     * Register an event to the model
     *
     * @param {String} evtName - the event name
     */
    addEvent(evtName) {
        if (!this._events) {
            this._events = [];
        }

        this._events.push(evtName);
    }

    /**
     * Registers an observer on the Model
     *
     * @param {MutationObserver} observer - the mutation observer
     */
    addObserver(observer) {
        if (!this._observers) {
            this._observers = [];
        }
        this._observers.push(observer);
    }

    /**
     * Returns the registered attributes on the model
     *
     * @returns {Array<String>} - the registered attributes
     */
    get attributes() {
        return this._attributes || [];
    }

    /**
     * Returns the registered events on the model
     *
     * @returns {Array<String>} - the registered events
     */
    get events() {
        return this._events || [];
    }

    /**
     * Generates the model from a DOM element
     *
     * @param   {HTMLElement} element - the element to parse the model from
     */
    fromDOM(element) {
        if (!this._exportableProperties) {
            return;
        }

        this._exportableProperties.forEach((exportableProperty) => {
            let result = exportableProperty.fromDOM(element);
            this[exportableProperty.name] = result;
        });
    }

    /**
     * Returns the registered properties on the model
     *
     * @returns {Object} - the registered properties
     */
    get properties() {
        if (!this._exportableProperties) {
            return;
        }

        let wrappedProperties = {};
        this._exportableProperties.forEach((property) => {
            wrappedProperties[property.name] = this[property.name];
        });
        return wrappedProperties;
    }

    /**
     * Destroys the model
     */
    destroy() {
        if (this._observers) {
            this._observers.forEach((observer) => {
                observer.disconnect();
            });
        }
        this._observers = null;
        this._attributes = null;
        this._exportableProperties = null;
    }
}
