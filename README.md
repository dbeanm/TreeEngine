# TreeEngine

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
