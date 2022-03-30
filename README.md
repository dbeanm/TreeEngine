# TreeEngine

This is a research tool in active development. Not for production use. 

## Overview
TreeEngine allows multiple models to be coordinated in a tree structure. Every node in the tree can contain one or more models (any function, a hand-crafted model, a learned model...) to run on entry. Edges have conditions to determine which path to follow after execution. For example the early nodes may run models for disease diagnosis and subtyping, then use edge conditions based on those results to then run relevant risk stratification, and from there run relevant drug elegibility models. 


The goals:
* models are loaded in a format that allows TreeEngine to inter a basic UI, which variables are used in multiple places, and to check for potential conflicts
* The full execution of the overall model is transparent and explainable
* Allow plugins to expand base features
* Minimum technical knowledge required to design models - only target domain expertise should be required

## Run
`npm run dev` is set to run a local test server. use for local testing.
`npm run start` is set to serve from a basic server for heroku
`npm run test-jest` is set up to run jest tests against *.test.js

## Plugins
Plugins should accept the function handleUpdateFromPlugin(update) as a property

The update object looks like:

```update = {'input': value, 'output': new_result, 'plugin': this.props.plugin_name}```

plugin_name must be the name the plugin is registered with in config and should be provided as the prop "plugin_name"

Plugins can trigger this update as needed when user input to their input elements changes. Plugins should be careful not to trigger unnecessary updates as many parts of the app are refreshed when updating from a plugin. Try to update only when a user interaction ends.

When user input is cleared, plugins must return reasonable "missing/none/null" values. 


### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Funding
Dan Bean is funded by a UKRI Innovation Fellowship at King's College London and Health Data Research UK

## Contact
Developed by Dan Bean at King's College London - daniel.bean@kcl.ac.uk