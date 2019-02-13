import React, { Component } from 'react';
import { expect } from "chai";

import { DOMModel, byJsonAttrVal, byAttrVal, byChildContentVal, registerEvent, createCustomElement } from "../index";

import JSONSnippet from "./dom-model/snippets/json-model.html";

describe("WebComponent", () => {
    let element, model;

    class Model extends DOMModel {
        @byJsonAttrVal("j-attr") jAttr;
        @byAttrVal weight;
        @byAttrVal height = 5;
        @byChildContentVal("child-value") value;
        @registerEvent change;
    }

    class ReactComponent extends Component {
        constructor(props) {
            super(props);
            window._reactProps = props;
        }

        render() {
            return (<div>
                <table>
                    <tbody>
                        <tr>
                            <td> weight </td>
                            <td id="weight">{ this.props.weight }</td>
                        </tr>
                        <tr>
                            <td> height </td>
                            <td id="height">{ this.props.height }</td>
                        </tr>
                        <tr>
                            <td> Json Attribute </td>
                            <td id="jAttr">{ JSON.stringify(this.props.jAttr) }</td>
                        </tr>
                        <tr>
                            <td> value </td>
                            <td id="value">{ this.props.value }</td>
                        </tr>
                    </tbody>
                </table>
            </div>)
        }
    }

    window.customElements.define("custom-component", createCustomElement(ReactComponent, Model, "container"));

    beforeEach(() => {
        let container = document.createElement("div");
        container.innerHTML = JSONSnippet;
        element = container.firstElementChild;
        model = new Model();
        model.fromDOM(element);

    });

    it("should register an element", (done) => {
        customElements.whenDefined('custom-component').then(() => {
            done();
        });
    });

    it("should have all the attributes", (done) => {
        customElements.whenDefined('custom-component').then(() => {
            document.body.appendChild(element);
            requestAnimationFrame(() => {
                expect(element.querySelector("#weight").textContent).to.equal("3");
                expect(element.querySelector("#value").textContent).to.equal("Test content");
                expect(element.querySelector("#jAttr").textContent).to.equal("[{\"example\":1},{\"test\":2}]");
                document.body.removeChild(element);
                done();
            });
        });
    });

    it("default value should be respected", (done) => {
        customElements.whenDefined('custom-component').then(() => {
            document.body.appendChild(element);
            requestAnimationFrame(() => {
                expect(element.querySelector("#height").textContent).to.equal("5");
                done();
            })
        });
    })

    it("attributes should update", (done) => {
        customElements.whenDefined('custom-component').then(() => {
            document.body.appendChild(element);
            requestAnimationFrame(() => {
                element.setAttribute("weight", "5");
                requestAnimationFrame(() => {
                    expect(element.querySelector("#weight").textContent).to.equal("5");
                    element.setAttribute("j-attr", "[{\"example\":3},{\"test\":4}]");
                    requestAnimationFrame(() => {
                        expect(element.querySelector("#jAttr").textContent).to.equal("[{\"example\":3},{\"test\":4}]");
                        element.querySelector("child-value").textContent = "SOMETHING";
                        requestAnimationFrame(() => {
                            expect(element.querySelector("#value").textContent).to.equal("SOMETHING");
                            document.body.removeChild(element);
                            requestAnimationFrame(() => {
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it("should clean up when unmounted", () => {
        customElements.whenDefined('custom-component').then(() => {
			expect(element.querySelector('div')).to.be.null;

			// CustomElement should create a container div
			document.body.appendChild(element);
			expect(element.querySelector('div')).to.exist;

			// CustomElement clean up the container div
			document.body.removeChild(element);
			expect(element.querySelector('div')).to.be.null;

			// Make sure that remounting it works
			document.body.appendChild(element);
			expect(element.querySelector('div')).to.exist;

			document.body.removeChild(element);
			expect(element.querySelector('div')).to.be.null;
        });
    });
});