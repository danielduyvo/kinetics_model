# Kinetics Model for Beta-Amyloid
## Purpose
Provide a model for aggregation vs. time that utilizes known mechanisms to define the differential equations. Incorporates activation of beta-amyloid monomers, nucleation of monomers and elongation of aggregates (as well as their reverse reactions) into the model.
## Use
Parameters are inputted into inputData.js, specifying initial conditions, rate constants and step sizes. Model is written in JavaScript and runs on Node.js, make sure to install [node](https://nodejs.org/) on your machine. Run
`npm start`
to run the model. The output file will be created in the current directory. Graphs can be made with the tool of your choice. Graphs that have already been produced have been created with R, with the base script written in ./graph.R.

