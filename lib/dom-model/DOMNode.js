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

/* eslint no-constant-condition: "off" */

const domNodeMutationOptions = { childList: true };

function handleDOMNodeMutation(mutations, observer) {
    const domNode = observer._domNode;
    if (!domNode.stolen) {
        return;
    }
    const node = domNode.node;
    const parentNode = node.parentNode;
    if (!parentNode) {
        domNode.applicationDidRemoveItem();
    }
}
/**
* This is a container around a HTMLElement which allows for the element to be removed from the DOM
* replaced with a comment and then returned back to the DOM
*/
export default class DOMNode {

    /**
     * Removes the node from the DOM and replaces with a comment
     * @returns {HTMLElement} - the HTML DOM node
     */
    stealNode() {
        if (this.stolen) {
            return null;
        }

        const node = this.node;
        this.returned = false;

        var placeholder = this.placeholder;
        if (!placeholder) {
            placeholder = this.placeholder = document.createComment('placeholder for ' + node.nodeName);
            placeholder._reactComponentDataNode = this;
        }

        node.parentNode.replaceChild(placeholder, node);
        this.stolen = true;
        return this.node;
    }

    /**
     * Returns the node to the DOM. It replaceses the comment with the node
     */
    returnNode() {
        if (!this.stolen) {
            return;
        }

        this.stolen = false;
        this.returned = true;
        this.stopObserving();

        const placeholder = this.placeholder;
        const placeholderParent = placeholder.parentNode;
        if (placeholderParent) {
            placeholderParent.replaceChild(this.node, placeholder);
        }
    }

    /**
     * Observes the mutations of the parent node to check if the users are removing the node.
     */
    observe() {
        if (this.observer) {
            this.stopObserving();
        }
        const observer = this.observer = new MutationObserver(handleDOMNodeMutation);
        observer._domNode = this;
        observer.observe(this.node.parentNode, domNodeMutationOptions);
    }

    /**
     * Stops the mutation observer
     */
    stopObserving() {
        const observer = this.observer;
        if (observer) {
            observer.disconnect();
            this.observer = null;
        }
    }

    /**
     * Marks that the application removed the item
     */
    applicationDidRemoveItem() {
        this.stolen = false;
        this.returned = true;
        this.stopObserving();
        this.remove();
    }

    /**
     * Adds the node to the list of child elements.
     * It will look for the correct position in the list of the element.
     * @param {Array<Object>} - the list of the child element
     */
    add(list) {

        this.list = list;
        var target = this.span || this.node;
        do {
            target = target.previousSibling;
            if (!target) {
                // this is the first item, just insert it at the very top.
                list.splice(0, 0, this);
                return;
            }
            const data = target._reactComponentDataNode;
            if (data) {
                // If the element is stolen, then we need to use the placeholder and not
                // the actual element. Otherwise the element might actually be added to the same
                // list of elements and might use the wrong position.
                if (data.stolen && data.placeholder !== target) {
                    // Continue until we find the right element.
                    continue;
                }
                const index = list.indexOf(data);
                if (index !== -1) {
                    list.splice(index + 1, 0, this);
                    return;
                }
            }
        } while (true);
    }

    /**
     * Removes the node
     */
    remove() {
        const list = this.list;
        if (list) {
            list.removeItem(this);
            this.list = null;
        }
        const node = this.node;
        if (node._reactComponentDataNode === this) {
            node._reactComponentDataNode = null;
        }
        this.removePlaceholder();
    }

    /**
     * Removes the placeholder of the node
     */
    removePlaceholder() {
        const placeholder = this.placeholder;
        if (placeholder) {
            const placeholderParent = placeholder.parentNode;
            if (placeholderParent) {
                placeholderParent.removeChild(placeholder);
            }
        }
    }
}

DOMNode.prototype.type = 'node';
