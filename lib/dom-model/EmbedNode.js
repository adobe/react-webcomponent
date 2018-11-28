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

import React, {Component} from 'react';

export default class EmbedNode extends Component {

	render() {
		return <div ref={ (element) => this.element = element }/>
	}

	componentDidMount() {
		this.parent = this.element.parentElement;
		this.stolenNode = this.props.item.stealNode();
		this.parent.replaceChild(this.stolenNode, this.element);
	}

	componentWillUnmount() {
		this.parent.replaceChild(this.element, this.stolenNode);
		this.props.item.returnNode();
		delete this.stolenNode;
	}

	shouldComponentUpdate() {
		// Prevent this node from rendering after it is mounted
		return false;
	}

	get hasStolenNode() {
		return this.stolenNode != null
	}
}
