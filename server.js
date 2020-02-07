// Dependencies
const express = require('express');

const app = express();
const port = process.env.PORT || 5000;

const model = require(__dirname + '/server_model.js');

/* Middleware */
// Bodyparser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* Routes */
app.get('/test', (req, res) => {
    // reroute to landing
    // res.redirect('/landing');
    model.test();
    res.send('test requested');
});

app.post('/model', async (req, res) => {
    await model.generate(req.body.initialConditions, req.body.n, req.body.forwardRates, req.body.backwardRates, req.body.metaparameters, req.body.nm);
    return res.download(__dirname + '/' + req.body.metaparameters.output_file);
    // Test request:
    // curl --header "Content-Type: application/json" --request POST --data "{\"initialConditions\":[0.1,0,0,0],\"n\":6,\"forwardRates\":[0.001,1.38,1200],\"backwardRates\":[0.0001,0.00101,302],\"metaparameters\":{\"output_file\":\"output.csv\",\"points\":100,\"step_size\":0.001,\"time_length\":100},\"nm\":2}" localhost:5000/model
})

app.use('/', express.static(__dirname + '/public'));

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})
