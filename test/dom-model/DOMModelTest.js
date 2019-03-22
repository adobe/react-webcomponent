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

import { expect, assert } from "chai";

import { DOMModel, byJsonAttrVal, byAttrVal, byBooleanAttrVal,
    byChildContentVal, byChildrenRefArray, registerEvent,
    byChildRef
} from "../../index";
import JSONSnippet from "./snippets/json-model.html";
import { byModel, byContentVal, byContent, byChildrenTypeArray, byChildModelVal } from "../../lib/dom-model/DOMDecorators";
import React from "react";
import ReactDOM from "react-dom";

describe("DOMModel", () => {
    let element, model;

    const makeModel = function(Model, snippet) {
        let container = document.createElement("div");
        container.innerHTML = snippet;
        element = container.firstElementChild;
        model = new Model();
        model.fromDOM(element);
        return {
            model,
            element
        }
    }

    class JSONModel extends DOMModel {
        @byJsonAttrVal("j-attr") jAttr;
        @byAttrVal weight;
        @byBooleanAttrVal required;
        @byChildContentVal("child-value") value;
        @registerEvent change;
    }


    describe("byJsonAttrVal", () => {
        it("parses the value correctly", () => {
            let { model } = makeModel(JSONModel, JSONSnippet);
            expect(model.jAttr).to.not.equal(undefined);
            expect(model.jAttr.length).to.equal(2);
            expect(model.jAttr[0].example).to.equal(1);
            expect(model.jAttr[1].test).to.equal(2);
        });
    });
    
    describe("byAttrVal", () => {
        it("parses the value correctly", () => {
            let { model } = makeModel(JSONModel, JSONSnippet);
            expect(model.weight).to.equal("3");
        });
    });

    describe("byBooleanVal", () => {
        it("parses the value correctly", () => {
            let { model, element } = makeModel(JSONModel, JSONSnippet);
            expect(model.required).to.equal(true);
            element.removeAttribute("required");
            model.fromDOM(element);
            expect(model.required).to.equal(false);
        });
    });

    describe("byChildContentVal", () => {
        it("parses the value correctly", () => {
            let { model } = makeModel(JSONModel, JSONSnippet);
            expect(model.value).to.equal("Test content");
        });

        it("child content updates with innerHTML", (done) => {
            let { element } = makeModel(JSONModel, JSONSnippet);
            element.addEventListener("_updateModel", (event) => {
                expect(event.detail[0].propertyName).to.equal("value");
                expect(event.detail[0].value).to.equal("Another content");
                done();
            });
    
            element.querySelector("child-value").innerHTML = "Another content";
        });
    
        it("child content updates with textContent", (done) => {
            let { element } = makeModel(JSONModel, JSONSnippet);
            element.addEventListener("_updateModel", (event) => {
                expect(event.detail[0].propertyName).to.equal("value");
                expect(event.detail[0].value).to.equal("Another textContent");
                done();
            });
    
            element.querySelector("child-value").textContent = "Another textContent";
        });
    });

    describe("registerEvent", () => {
        it("event should be registered", () => {
            let { model } = makeModel(JSONModel, JSONSnippet);
            expect(model.events.length).to.equal(1);
            expect(model.events[0]).to.equal("change");
        });
    });

    describe("byModel", () => {

        class CustomModel extends DOMModel {
            @byModel(JSONModel) customModel;
        }
        it("parses the value correctly", () => {
            let { model, element } = makeModel(CustomModel, JSONSnippet);
            
            expect(model.customModel.jAttr).to.not.equal(undefined);
            expect(model.customModel.jAttr.length).to.equal(2);
            expect(model.customModel.jAttr[0].example).to.equal(1);
            expect(model.customModel.jAttr[1].test).to.equal(2);

            expect(model.customModel.weight).to.equal("3");

            expect(model.customModel.required).to.equal(true);
            element.removeAttribute("required");
            model.fromDOM(element);
            expect(model.customModel.required).to.equal(false);

            expect(model.customModel.value).to.equal("Test content");
            expect(model.customModel.events.length).to.equal(1);
            expect(model.customModel.events[0]).to.equal("change");
        });
    });

    describe("byChildrenRefArray", () => {
        let element, model;

        class OptionModel extends DOMModel {
            @byContentVal() text;
            @byAttrVal() value;
        }

        class ChildrenModel extends DOMModel {
            @byChildrenRefArray("option", OptionModel) options;
        }
        beforeEach(() => {
            let result = makeModel(ChildrenModel, `<select>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
                <option value="option4">Option 4</option>
            </select>`);
            element = result.element;
            model = result.model;
        });

        const checkOption = function(option, level) {
            expect(option.value).to.equal(`option${level}`);
            expect(option.text).to.equal(`Option ${level}`);
        }

        it("parses the value correctly", () => {
            expect(model.options).to.exist;
            expect(model.options).to.be.an('array');
            expect(model.options).to.have.lengthOf(4);
            for(let i = 0; i < model.options.length; i++) {
                checkOption(model.options[i], i + 1);
            }
        });

        it("updates the value when attribute changes", (done) => {
            let option = element.querySelector(`option[value="option2"]`);
            expect(option).to.exist;
            element.addEventListener("_updateModel", (event) => {
                let newValue = event.detail[0].value;
                expect(newValue).to.exist;
                expect(newValue).to.be.an('array');
                expect(newValue).to.have.lengthOf(4);
                expect(newValue[1].value).to.equal("optionNew");
                done();
            });
            option.setAttribute("value", "optionNew");
        });

        it("updates the value when content changes", (done) => {
            let option = element.querySelector(`option[value="option2"]`);
            expect(option).to.exist;
            element.addEventListener("_updateModel", (event) => {
                let newValue = event.detail[0].value;
                expect(newValue).to.exist;
                expect(newValue).to.be.an('array');
                expect(newValue).to.have.lengthOf(4);
                expect(newValue[1].text).to.equal("Changed Option Label");
                done();
            });
            option.innerText = 'Changed Option Label';
        });

        it("updates when removing item", (done) => {
            let option = element.querySelector(`option[value="option2"]`);
            expect(option).to.exist;
            element.addEventListener("_updateModel", (event) => {
                let newValue = event.detail[0].value;
                expect(newValue).to.exist;
                expect(newValue).to.be.an('array');
                expect(newValue).to.have.lengthOf(3);
                expect(newValue[0].value).to.equal("option1");
                expect(newValue[1].value).to.equal("option3");
                expect(newValue[2].value).to.equal("option4");
                done();
            });
            option.remove();
        });

        it("updates when adding item", (done) => {
            let option = element.querySelector(`option[value="option3"]`);
            expect(option).to.exist;
            element.addEventListener("_updateModel", (event) => {
                let newValue = event.detail[0].value;
                expect(newValue).to.exist;
                expect(newValue).to.be.an('array');
                expect(newValue).to.have.lengthOf(5);
                expect(newValue[0].value).to.equal("option1");
                expect(newValue[1].value).to.equal("option2");
                expect(newValue[2].value).to.equal("option5");
                expect(newValue[3].value).to.equal("option3");
                expect(newValue[4].value).to.equal("option4");
                done();
            });
            let newOption = document.createElement("option");
            newOption.setAttribute("value", "option5");
            newOption.innerText = "Option 5"
            element.insertBefore(newOption, option);
        });
    });

    describe("byChildrenTypeArray", () => {
        let element, model;
        class ChildType1 extends DOMModel {
            @byContentVal() content;
            @byAttrVal() size;
        }

        class ChildType2 extends DOMModel {
            @byBooleanAttrVal() selected;
        }

        class ParentModel extends DOMModel {
            @byChildrenTypeArray({
                "child-one": ChildType1,
                "child-two": ChildType2
            }) items;
            @byBooleanAttrVal() disabled;
        }

        beforeEach(() => {
            let result = makeModel(ParentModel, `<parent>
                <child-one size="XL">Content</child-one>
                <child-two selected>Ignored</child-two>
                <child-one size="L">Content2</child-one>
            </parent>`);
            element = result.element;
            model = result.model;
        });

        it("should parse the value correctly", () => {
            expect(model.items).to.exist;
            expect(model.items).to.be.an("array");
            expect(model.items).to.have.lengthOf(3);
            assert.instanceOf(model.items[0], ChildType1);
            assert.instanceOf(model.items[1], ChildType2);
            assert.instanceOf(model.items[2], ChildType1);
        });

        it("updates works", () => {
            element.addEventListener("_updateModel", (event) => {
                expect(event.detail[0].propertyName).to.equal("items");
                let items = event.detail[0].value;
                expect(items).to.exist;
                expect(items).to.be.an("array");
                expect(items).to.have.lengthOf(4);
                assert.instanceOf(items[0], ChildType1);
                assert.instanceOf(items[1], ChildType2);
                assert.instanceOf(items[2], ChildType1);
                assert.instanceOf(items[3], ChildType1);
            });
            let newChild = document.createElement("child-one");
            newChild.setAttribute("value", "5");
            newChild.innerText = "new content";
            element.appendChild(newChild);
        });
    });

    describe("byChildRef", () => {
        let element, model;

        class ChildModel extends DOMModel {
            @byAttrVal() size;
        }

        class ParentModel extends DOMModel{
            @byChildRef("child", ChildModel) child;
        }

        beforeEach(() => {
            let result = makeModel(ParentModel, `<parent>
                <child size="XL"></child>
            </parent>`);
            element = result.element;
            model = result.model;
        });

        it("should parse the model correctly", () => {
            expect(model.child).to.exist;
            assert.instanceOf(model.child, ChildModel);
        });
    });

    describe("byChildModelVal", () => {
        let element, model;
        class ChildModel extends DOMModel {
            @byAttrVal() size;
        }

        class ParentModel extends DOMModel{
            @byChildModelVal("child", ChildModel) child;
        }

        beforeEach(() => {
            let result = makeModel(ParentModel, `<parent>
                <child size="XL"></child>
            </parent>`);
            element = result.element;
            model = result.model;
        });

        it("parses the model", () => {
            let child = element.firstElementChild;
            const childModel = { "x" : 3 };
            child._generateModel = function() {
                return childModel; 
            };
            model.fromDOM(element);
            expect(model.child).to.exist;
            expect(model.child).to.deep.equal(childModel);
        })
    });

    describe("byContentVal", () => {

        class ButtonModel extends DOMModel {
            @byAttrVal() variant;
            @byContentVal() label;
        }

        beforeEach(() => {
            let result = makeModel(ButtonModel, `
                <my-button variant='action'>Push Me</my-button>
            `);
            element = result.element;
            model = result.model;
        });

        it("parses the model", () => {
            expect(model.variant).to.equal('action');
            expect(model.label).to.equal('Push Me');
        });

        it("updates when the DOM changes", (done) => {
            expect(model.variant).to.equal('action');
            expect(model.label).to.equal('Push Me');

            element.addEventListener("_updateModel", (event) => {
                let change = event.detail[0];
                expect(change.propertyName).to.equal('label');
                expect(change.value).to.equal('New Label');
                done();
            });

            element.innerHTML = 'New Label';
        });
    });

    describe("byContent", () => {
        let element, model;

        class ComponentItemModel extends DOMModel {
            @byContentVal() name;
        }
        
        class ComponentModel extends DOMModel {
            @byAttrVal() size;
            @byChildrenRefArray('component-item', ComponentItemModel) items;
            @byContent('section') content;
        }
        
        beforeEach(() => {
            let result = makeModel(ComponentModel, `
                <div>
                    <component size="L">
                        <component-item>Item 1</component-item>
                        <component-item>Item 2</component-item>
                        <section>
                            <p>my content</p>
                        </section>
                    </component>
                    <div id='mount-point'></div>
                </div>
            `);
            element = result.element;
            model = result.model;
        });

        it("reparents captured content", (done) => {
            let mountPoint = element.querySelector('#mount-point');
            element = element.firstElementChild;

            model.fromDOM(element);

            // Make sure that the rest of the model is there
            expect(model.size).to.equal('L');
            expect(model.items).to.exist;
            expect(model.items).to.be.an('array');
            expect(model.items).to.have.lengthOf(2);

            expect(model.content).to.exist;
            let component = <div>{ model.content }</div>
            ReactDOM.render(component, mountPoint, () => {
                let div = mountPoint.firstElementChild;
                let section = div.firstElementChild;
                expect(section).to.exist;
                expect(section.tagName).to.equal('SECTION');
                let p = section.firstElementChild;
                expect(p).to.exist;
                expect(p.tagName).to.equal('P');
                expect(p.innerText).to.equal('my content');

                ReactDOM.unmountComponentAtNode(mountPoint);

                setTimeout(() => {
                    expect(mountPoint.firstElementChild).to.be.null;

                    let component = element.querySelector('component');
                    let section = element.querySelector('section');

                    // Make sure that the content has been put back
                    expect(section).to.exist;
                    expect(section.tagName).to.equal('SECTION');
                    let p = section.firstElementChild;
                    expect(p).to.exist;
                    expect(p.tagName).to.equal('P');
                    expect(p.innerText).to.equal('my content');
    
                    done();
                }, 1)
            })
        })
    });
});
