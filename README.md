# React Web Component

This project aims to bridge the connection between a React Component and a CustomElement.
The strategy the library takes is to create a model that defines how the DOM is translated into React props.

Since the goal is support React components as CustomElements we are not supporting extending from builting elements such as Paragraph, Select etc. 

It supports:
* Updating the React component automatically when attributes get changed
* Supports automatic registration and triggering of events
* Supports multiple render targets, the custom element itself, a container div or shadow root.
* Allows parsing and updating of nested structures of DOM, for example:
```js
    <select>
        <option value="something">Else</option>
        <option value="certain">Value</option>
    </select>
```
This DOM structure can be transformed into a model and automatically injected into a React Component.
You can transform *any* DOM structure into a model that will be passed to the React Component.
This allows you to make use of most of the DOM api and encapsulate React as an implementation detail.

### Installing the library

```
npm install @adobe/react-webcomponent
```

If you are using Babel 6:
Because we are targeting CustomElements V1 and we are using Babel to transpile our code there will be a problem with instantiating the CustomElement.
See [this issue](https://github.com/w3c/webcomponents/issues/587) for the discussion. 
Include the [custom-elements-es5-adapter](https://github.com/webcomponents/webcomponentsjs#custom-elements-es5-adapterjs) before you load this librabry to fix this issue.

Is you are using Babel 7: the issues is fixed so you shouldn't need anything else.

We are using class properties and decorators so make sure you include the appropriate babel plugins to use this.  

### Defining a Custom Element
The first thing which is need is a React Component to expose as a Custom Element

```jsx
import React, { Component } from 'react';

import { createCustomElement, DOMModel, byContentVal, byAttrVal, registerEvent } from "@adobe/react-webcomponent";

class ReactButton extends Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (<div>
            <button weight={ this.props.weight }>{ this.props.label }</button>
            <p>Text</p>
        </div>)
    }
}
```
Then you need to create a model which defines how the DOM is parsed into React properties.

```jsx
class ButtonModel extends DOMModel {
    @byContentVal text = "something";
    @byAttrVal weight;
    @registerEvent("change") change;
}
```
You create the custom element
```jsx
const ButtonCustomElement = createCustomElement(ReactButton, ButtonModel, "container");
```
And then register it

```js
window.customElements.define("test-button", ButtonCustomElement);
```

#### Defining where the React component will be rendered

When defining the CustomElement you have the posibility to specify where the React component will be rendered by specifying the `renderRoot` property. 
The possible values are:  
* container  
This will generate an extra div inside the custom element and the React Component will be rendered there.  
This is useful because React will remove all the children of the container element it renders in.  
So if you would like to parse values from the provided markup of the custom element and modify them, the elements will be lost after the initial rendering.  
For example:
```js
<my-button>
  <my-button-label>My Button</my-button-label>
</my-button>
```
> If we wouldn't render in a container the `my-button-label` element would be removed by React when rendering.

* shadowRoot   
This will determine the creation of the custom element shadowRoot and the React component will be rendered in it

* element   
The React component will be rendered directly in the custom element.

#### Extending the custom element
By default we provide the utility to create a custom element `createCustomElement`. This encapsulates the default behaviour but doesn't allow extension of the element.  
This can be bypassed and the customElement can be extended with new capabilities.

```js
import { CustomElement } from "@adobe/react-webcomponent";

class ButtonCustomElement extends CustomElement {
    constructor() {
        super();
        this._custom = 3;
    }
    get custom() {
        return this._custom;
    }

    set custom(value) {
        this._custom = value;
    }
};
ButtonCustomElement.observedAttributes = Model.prototype.attributes;
ButtonCustomElement.domModel = Model;
ButtonCustomElement.ReactComponent = ReactComponent;
ButtonCustomElement.renderRoot = "container"; // optional, defaults to "element"
window.customElements.define("test-button", ButtonCustomElement);
```

### DOMModel
This utility is reponsible from converting a DOM node to a model. The model is decorated with a series of specialize decorators. Each decorator will parse the dom and construct the model:
* [byAttrVal](#byattrval)
* [byBooleanAttrVal](#bybooleanattrval)
* [byJsonAttrVal](#byjsonattrval)
* [byContentVal](#bycontentval)
* [byContent](#bycontent)
* [byChildContentVal](#bychildcontentval)
* [byChildRef](#bychildref)
* [byModel](#bymodel)
* [byChildModelVal](#bychildmodelval)
* [byChildrenRefArray](#bychildrenrefarray)
* [byChildrenTypeArray](#bychildrentypearray)
* [registerEvent](#registerevent)

#### byAttrVal . 

Parses the element and sets the value corresponding to the attribute value of element
```js
@byAttrVal(attrName:string) - defaults to the name of the property that it decorates.
```
```js
class Model extends DOMModel {
    @byAttrVal() weight;
    @byAttrVal("custom-attribute-name") reactPropName;
}
```
Usage:
```js
<div id="elem" weight="3" custom-attribute-name="some value"/>
const model = new Model().fromDOM(document.getElementById("elem"));
model ~ {
    weight: "3",
    reactPropName: "some value"
}
```

#### byBooleanAttrVal  

Parses the element and sets the value corresponding to the presence of the attribute on the element.  
The value of the attribute is ignored, only the presence of the attribute determines the value
```js
@byBooleanAttrVal(attrName:string) - defaults to the name of the property it decorates
```
```js
class Model extends DOMModel {
    @byBooleanAttrVal() checked;
    @byBooleanAttrVal("is-required") required;
}
```
Usage:
```js
<div id="elem" checked/>
const model = new Model().fromDOM(document.getElementById("elem"));
model ~ {
    checked: true,
    required: undefined
}
<div id="elem" checked is-required/>
model.fromDOM(document.getElementById("elem"));
model ~ {
    checked: true,
    required: true
}
```

#### byJsonAttrVal

Parses the element and sets the value by parsing the value using `JSON.parse`.
```js
class Model extends DOMModel {
    @byJsonAttrVal() obj;
    @byJsonAttrVal("alias-attr") anotherObj;
}

<div id="elem" obj='[{"example":1},{"test":2}]' alias-attr='[{"other":"example},{"test":3}]'/>
const model = new Model().fromDOM(document.getElementById("elem"));
model ~ {
    obj: [{"example":1},{"test":2}],
    anotherObj: [{"other":"example},{"test":3}]
}
```

#### byContentVal
Parse the element and sets the value to the `innerText` of the element.
```js
class Model extends DOMModel {
    @byContentVal() label;
}
<div id="elem">My Label</div>
const model = new Model().fromDOM(document.getElementById("elem"));
model ~ {
    label: "My Label"
}
```

#### byContent
This decorator allows you to capture a DOM node that is matched by a CSS selector.
This can be used to reparent arbitrary child DOM content, which may not have been
rendered with React, into your web component. Once parsing has occurred, the field
in the model will contain a React component that represents the DOM content that
will be reparented.

The DOM content will be moved when the React component is mounted. And, the content
will be put back in its original location if the React component is later unmounted.
```js
@byContent(attrName:selector) - the CSS selector that will match the child node.
```
```js
class Model extends DOMModel {
    @byContent('.content') content;
}
<div id="elem">
    <div class="content">
        This will be reparented
    </div>
</div>
<div id="mount-point"/>

const model = new Model().fromDOM(document.getElementById("elem"));
ReactDOM.render(<div>{ model.content }</div>, document.getElementById("mount-point"))

// Once React has rendered the above component, the DOM will look like this

<div id="elem">
    <!-- placeholder for DIV -->
</div>
<div id="mount-point">
    <div class="content">
        This will be reparented
    </div>
</div>
```

#### byChildContentVal
Parse the element looking for an element that matches the given selector and sets value to the `innerText` of that element
```js
class Model extends DOMModel {
    @byChildContentVal("custom-label") label;
}
<div id="elem"><custom-label>My Label</custom-label></div>
const model = new Model().fromDOM(document.getElementById("elem"));
model ~ {
    label: "My Label"
}
```

#### byChildRef
Parses the element and looks for an child element that matches the given selector and sets the value to result of parsing the child element with the given model

```js
class CustomLabelModel extends DOMModel {
    @byContentVal() value;
    @byAttrVal() required;
}
class Model extends DOMModel {
    @byChildContentVal("custom-label", CustomLabelModel) label;
}

<div id="elem"><custom-label required>My Label</custom-label></div>
const model = new Model().fromDOM(document.getElementById("elem"));
model ~ {
    label: {
        value: "My Label",
        required: true
    }
}
```

#### byModel
Assigns the value of running a given model over the element.
This allows the element model to be saved on a different property than directly on the model.

```js
class CustomModel extends DOMModel {
    @byContentVal() value;
    @byAttrVal() required;
}

class Model extends DOMModel {
    @byModelVal() item;
}

<div id="elem" required>Content</div>
const model = new Model().fromDOM(document.getElementById("elem"));
model ~ {
    item: {
        value: "Content",
        required: true
    }
}
```

#### byChildModelVal
Parse the element and sets the value by getting the model value from the custom elem.
This attribute only returns something if there is a custom element parsed.

Using the Button defined at the beginning:
```js
window.customElements.define("test-button", ButtonCustomElement);
```
We define a model
```js
class Model extends DOMModel {
    @byChildModelVal("test-button") button;
}

<div><test-button weight="3">Click me</test-button></div>
const model = new Model().fromDOM(document.getElementById("elem"));
model ~ {
    button: {
        weight: 3,
        text: "Click me"
    }
}
```
The fundamental difference here is that the model is defined in another custom element and it is reused in this model.
So it doesn't get redefined.

#### byChildrenRefArray
Parse the element children and selects all the elements that match the provided selector.   
For each element it uses the referenced model to parse the value of the element.   
All the resulting array of values is stored as the value on the decorated property.   

```js
class OptionModel extends DOMModel {
    @byContentVal() content;
    @byAttrVal() value;
    @byBooleanAttrVal() selected;
}

class SelectModel extends DOMModel {
    @byChildrenRefArray("option", OptionModel) options;
}

<select id="elem">
    <option value="1">Amsterdam</option>
    <option value="2">Berlin</option>
    <option value="3">London</option>
</select>
const model = new Model().fromDOM(document.getElementById("elem"));
model ~ {
    options: [{value: 1, content: "Amsterdam"}, {value: 2, content: "Berlin"}, {value: 3, content: "London"}]
}
```

#### byChildrenTypeArray
Parses the element children and for each child if the nodeName matches one from the provided map it will parse that child with the corresponding model.

```js
class Child1Model extends DOMModel {
    @byAttrVal() checked;
}

class Child2Model extends DOMModel {
    @byAttrVal() selected;
}

class Model extends DOMModel {
    @byChildrenTypeArray({
        "child-one": Child1Model,
        "child-two": Child2Model
    }) items;
}

<div id="elem">
    <child-one checked/>
    <child-two selected/>
</div>
const model = new Model().fromDOM(document.getElementById("elem"));
model ~ {
    items: [{checked: true}, {selected: true}]
}
```

#### registerEvent
Registers an event to be registered on the React component and when it is called it a CustomEvent will be triggered on the custom element.
The event name is automatically transformed into camelCase and prefixed with `on`
*This behaviours happens on the CustomElement not the DOMModel, the DOMModel only registers the event*
```js
class Model extends DOMModel {
    @registerEvent("change") change;
}
```
Eventually this will be converted the CustomElement in a `onChange` property on the React component. 


