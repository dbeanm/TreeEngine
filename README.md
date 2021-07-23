# TreeEngine

## TODO / changelog to triage into issue tracker
# next
## bugs

- refresh_all_variables() on load? as a way to make sure metadata is up to date

- sanitise node/upload/model/unit names to remove dot and dash, replace with underscore. remove dots because it messes up react-table, remove dash because I use it as a separator internally.

-bool variables not handles correctly? 
-- the condition value is converted to an actual boolean value but not the input value
-- not sure where the input value is converted to a bool in esyn. For a batch it explicitly is but not clear where for a manual input.
-model outputs should be converted to the type set by Unit.output_type 

-check that variables of each type can be set as required and will be required in the model
-check that model input is converted to the correct type before running - missing num values are sent as an empty string not NaN

- when a unit is added to a node the name field should reset
- need to check nodes with no conditions will run like an else
- when a node is renamed the new name box should reset to blank

- when we have calculators and rules on the container, they also need to be checked for use of deleted variables when units/nodes are removed
- need to be able to set calculator mode on the container now it has calculators
- show calculator output in container
-- for container level calculators
-- for calculators inside units??
--- or for these just show that it COULD be set by a calculator inside a unit
-- ability to edit calculators and rules in container

- add stop conditions? e.g. require some/all models from a node to run before continuing?
- unit level setting for whether the result should be shown in overall output (i.e. to hide intermediate calculations)


## features
- add links to view in esyn for imported units
- calculators and rules on graph container

- currently if a variable is linked to a unit, this result will always overwrite a user value. Need to decide which values can be overwritten - can "set to unknown" be overwritten? May need to be a model level flag. 
-- https://github.kcl.ac.uk/k1513575/esyn-web/blob/master/src/app_DecisionTree.js#L2370
-- this needs updating in esyn too, an in esyndecisiontree class
-- always/missing/never options for using calculated variables

- show which variables can be calculated internally in some models
- esyn models should be able to show their possible outputs
- show a "did not run" state for models that were not on the path of the tree. similarly highlight layers that were in the path
-- or show only these nodes, in a labelled series e.g. 1, 2, 3? as boxes with a downward arrow between?
- double check how undefined/unknown/not-set should be handled
- need a "reset input" button in run tab


# esyn changes needed
ESYN tests for missing variable
- i don't think you can test for a boolean variable being missing - because if you set it to undefined it comes through as "" and is considered missing so can't be tested against anything
- i think this is an esyn level issue. even if you do !=true AND !=false you can't pass that test because missing does not get tested, and in this situation it would still follow a sibling ELSE, or any other edge where the conditions were met, which could lead to a very wrong situation.
- also can't test for a number being missing in esyn.
- in esyn this could be an operator "IS MISSING" with no value
- ESYN - continuing to run even if some conditions cannot be evaluated should be optional


#later
-change default dt ui group name from "" to something like (no group)?
- add a confirm popup if deleting a unit or node would also alter some conditions (because the variables no longer exist) - ok to continue and update conditions, cancel to do nothing
- show error if output type of model is not the correct type for the linked variable or prevent the link being created at all. 
- make "add and link" so as a unit is added it can be immediately linked to a variable
- able to import multiple projects from esyn at once
-models should be able to return their own possible output values, so that only these can be selected from a dropdown when creating the if conditions in the container logic
- show results in the graph visualisation, on each node?
- highlight those variables that are used in any model but cannot be calculated??
- when a unit is linked to a variable, check it is the correct type and that the unit is executed before the first layer that uses the variable
-it is possible internally for a unit to override the output type set by a model. Make this possible in the editor somewhere. Could be changed at any time not just when added. 
- calculators will probably need to run in the workspace component directly, to then control the user input component
- verify loaded container using a hash of some properties and e.g. https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
- deleting a layer or unit will reset the state.user_input object, meaning current user inputs are lost when something is deleted from the model but not when something is added. Make it possible to keep current values for remaining variables after delete. Need to edit updateInputObjectFromContainer

#done
- when multiple units are added the form should reset
- dt ui groups - editable directly on run_model ui?
-- e.g. empty input box to add group, then dropdown "move variable here"?
-- CRUD for groups
-- add var to group
-- remove var from group (to empty "" group)
- batch mode template file
- batch mode upload
- batch mode run
- run rules on container
- run calculators on container
- rules are applied to calculated values WITHOUT going through merge_with_calculators - could create some odd issues as this is not going to always be the input the model sees
- bugs with renaming nodes/layers
-- if the target node of an edge is renamed, the edge no longer has a target arrow
- take 'link api key' out of dev so it takes an actual key
- if the unit that contains a variable used in a condition is deleted, the conditions that refer to that variable should also be deleted. needs to happen if deleted from all layers, or if all containing layers are deleted
- unitlinkview creates a warning on load due to null value
-default bool var value needs to be "Unknown" not js undefined
-- can't delete a layer that contains a linked variable (because the appearances list no longer exist)
- deleting condition did not update the graph view - labels remained
- check the links object also updates correctly if you delete the layer TARGET of the link i.e. all the layers that contains the variable - needs to work correctly if used once or more than once
-renaming bugs
-- can't rename a unit if the layer was already renamed - sends old layer name to function
-- can't rename a layer more than once - sends old name to function
-- can't rename target node at all in workspace25 - error with links - renaming a layer that doesn't have a link
-- the old name is still displayed in the results view in the run tab and in the model detail tab
- use unit links when model runs rather than always overwriting input state with unit output
- create specific links between units and variables
- remove current model design tab, make graph tab the main tab and rename model design
- show a summary of the model output on the run tab
- add a delete unit method 
- make it so the name used for a unit inside a layer can be edited after adding
-- wired up, need to do the internal logic. maybe need a container level step to re-identify variables + where used. 
-- rename is the same as delete(old)+add(new)
-add conditions to graph container edges - add_condition_to_edge
-list current conditions for container edges
-able to remove conditions for edges
-execute model in graph container
-graphcontainer needs to reset old results (layer state) so that the correct results are shown for models that don't run this time that did run before
- add back the code to track where variables are used in conditions - track them in state.inputs.usable - don't allow conflicted variable in condition
-nicer summary of compute node contents - maybe expandable?
-formatting of label nodes
-organise available esyn units by their myesyn groups
- allow node (layer) names to be edited
- when a node is renamed, refresh the information window to have the new name\
- need to be able to delete an edge
-show that a unit has been created from esyn and hide from being created again
- in the new load the "model name" is being set to the name for the unit in the layer but should be the file name used when the unit was upload



# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
