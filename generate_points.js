const params = require(__dirname + '/generateParams.js');
const model = require(__dirname + '/server_model.js');
const fs = require('fs');
const generatePoints = () => {
    try {
        fs.mkdirSync(__dirname + params.output_folder);
    } catch (err) {
        console.log(err.no);
        console.log(err);
    }
    for (let i = 0; i < params.number.n; i++) {
        for (let j = 0; j < params.number.forwardRates[0]; j++) {
            for (let k = 0; k < params.number.forwardRates[1]; k++) {
                for (let l = 0; l < params.number.forwardRates[2]; l++) {
                    for (let m = 0; m < params.number.backwardRates[0]; m++) {
                        for (let n = 0; n < params.number.backwardRates[1]; n++) {
                            for (let o = 0; o < params.number.backwardRates[2]; o++) {
                                let file_name = params.output_folder +
                                    (params.start.n + params.change.n * i) + '_' +
                                    (params.start.forwardRates[0] + params.change.forwardRates[0] * j) + '_' +
                                    (params.start.forwardRates[1] + params.change.forwardRates[1] * k) + '_' +
                                    (params.start.forwardRates[2] + params.change.forwardRates[2] * l) + '_' +
                                    (params.start.backwardRates[0] + params.change.backwardRates[0] * m) + '_' +
                                    (params.start.backwardRates[1] + params.change.backwardRates[1] * n) + '_' +
                                    (params.start.backwardRates[2] + params.change.backwardRates[2] * o);
                                model.generate(
                                    params.initialConditions,
                                    params.start.n + params.change.n * i,
                                    [
                                        params.start.forwardRates[0] + params.change.forwardRates[0] * j,
                                        params.start.forwardRates[1] + params.change.forwardRates[1] * k,
                                        params.start.forwardRates[2] + params.change.forwardRates[2] * l
                                    ],
                                    [
                                        params.start.backwardRates[0] + params.change.backwardRates[0] * m,
                                        params.start.backwardRates[1] + params.change.backwardRates[1] * n,
                                        params.start.backwardRates[2] + params.change.backwardRates[2] * o
                                    ],
                                    {
                                        step_size: params.step_size,
                                        time_length: params.time_length,
                                        points: params.points,
                                        output_file: __dirname + file_name
                                    }
                                );
                            }
                        }
                    }
                }
            }
        }
    }
}

generatePoints();
