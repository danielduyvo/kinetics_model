// Model
// n[M] <=> [A_1], rate constants k_0 and k_0m
// [M] + [A_i] <=> [A_(i+1)], rate constants k_i and k_im
// d[M]/dt = + k_0m*n*[A_1] - k_0*[M]^n - sum of i from 1 to j ( k_(i)*[M]*[A_i] )
// d[A_1]/dt = + k_0*[M]^n + k_1m*[A_2] - k_0m*[A_1] - k_1*[M]*[A_1]
// d[A_i]/dt = + k_(i-1)*[M]*[A_(i-1)] + k_(i)m*[A_(i+1)] - k_(i-1)m*[A_i] - k_(i)*[M]*[A_i]

const fs = require('fs');
const input = require('./inputData.js');
const { spawn } = require('child_process');

/**
 * Takes in parameters and generates modeled data of concentrations during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size and time_length, which are in milliseconds
 */
const generateModeledConcentrations = (initialConditions, n, forward, backward, metaparameters) => {
    // Check if datasets are valid
    if (initialConditions.length * 2 != forward.length + backward.length + 2) throw new Error("Datasets are of wrong length");

    // Cheeck if metaparameters are valid
    let { step_size, time_length } = metaparameters;
    if (step_size <= 0) throw new Error("Step size must be a positive number");
    if (time_length < step_size) throw new Error("Time length must be longer than step size");

    // Setup conditions array
    let conditions = [];
    for (let i = 0; i < initialConditions.length; i++) {
        conditions[i] = initialConditions[i];
    }

    // Setup results array
    let results = [];
    results.push(initialConditions);

    // Generate model functions
    let diffEqs = [];

    // Monomer differential equation
    diffEqs.push(() => {
        let diff = 0;
        // Monomer concentration increases with the dissociation rate, dependent on A_1 concentration
        // Monomer concentration decreases with the association rate, dependent on M concentration to the power of n
        diff = backward[0] * conditions[1] - forward[0] * Math.pow(conditions[0], n);
        // Monomer concentration decreases with the association rate, dependent on M concentration and A_j concentration
        for (let j = 1; j < conditions.length - 1; j++) {
            diff -= forward[j] * conditions[0] * conditions[j];
        }
        return diff;
    })

    // First aggregate differential equation
    diffEqs.push(() => {
        let diff = 0;
        // Aggregate concentration increases with the association rate, dependent on M concentration to the power of n
        // Aggregate concentration decreases with the dissociation rate, dependent on A_1 concentration
        diff = forward[0] * Math.pow(conditions[0], n)
        diff -= backward[0] * conditions[1];
        // Aggregate concentration decreases with the association rate, dependent on M concentration and A_1 concentration
        diff -= forward[1] * conditions[0] * conditions[1];
        // Aggregate concentration increases with the dissociation rate, dependent on A_2 concentration
        diff += backward[1] * conditions[2];
        return diff;
    })

    // Aggregate differential equations
    for (let i = 2; i < conditions.length - 1; i++) {
        diffEqs.push(() => {
            let diff = 0;
            // Aggregate concentration increases with the association rate, dependent on M concentration and A_i-1 concentration
            // Aggregate concentration decreases with the dissociation rate, dependent on A_i concentration
            diff = forward[i-1] * conditions[0] * conditions[i-1]
            diff -= backward[i-1] * conditions[i];
            // Aggregate concentration decreases with the association rate, dependent on M concentration and A_i concentration
            diff -= forward[i] * conditions[0] * conditions[i];
            // Aggregate concentration increases with the dissociation rate, dependent on A_i+1 concentration
            diff += backward[i] * conditions[i+1];
            return diff;
        })
    }

    // Final aggregate differential equation
    diffEqs.push(() => {
        let diff = 0;
        // Aggregate concentration increases with the association rate, dependent on M concentration and A_i-1 concentration
        // Aggregate concentration decreases with the dissociation rate, dependent on A_i concentration
        diff = forward[conditions.length - 2] * conditions[0] * conditions[conditions.length - 2]
        diff -= backward[conditions.length - 2] * conditions[conditions.length - 1];
        return diff;
    })

    // Generate data
    let step = 0;
    while (step < time_length) {
        results.push([]);
        let last_set = results.length - 1;
        for (let i = 0; i < conditions.length; i++) {
            let newState = diffEqs[i]() * step_size + conditions[i]; // Newton's method
            results[last_set].push(newState);
        }
        for (let i = 0; i < conditions.length; i++) {
            conditions[i] = results[last_set][i];
        }
        step += step_size;
        
    }

    return results;
}

/**
 * Takes in parameters and writes the generated modeled data of concentrations during an aggregation into a 'concentrations.csv' file
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size and time_length, which are in milliseconds
 */
const printConcentrationsCSV = (initialConditions, n, forward, backward, metaparameters) => {
    let model = generateModeledConcentrations(initialConditions, n, forward, backward, metaparameters);
    // Print out output
    let csv = '';
    for (let i = 0; i < model.length; i++) {
        csv += model[i].join(',') + '\n';
    }
    fs.writeFile('concentrations.csv', csv, (err) => {
        if (err) throw err;
        console.log('printConcentrationsCSV:', 'Concentration data written to concentrations.csv');
    });
}

/**
 * Takes in parameters and creates a graph of the concentrations into 'concentrations.png' from generated modeled data of absorbance during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size and time_length, which are in milliseconds
 */
const generateConcentrationsGraph = (initialConditions, n, forward, backward, metaparameters) => {
    let concentrations = generateModeledConcentrations(initialConditions, n, forward, backward, metaparameters);
    let data = '';
    for (let i = 0; i < concentrations.length; i++) {
        data += concentrations[i].join(',') + '\n';
    }
    let graphs = 'plot(times, data[,1], col=hsv(0, 1, 1), ylim=c(0, maximum), xlab="Time (s)", ylab="Molarity (M)")\n';
    let legend_0 = `legend("top", legend = c("M"`;
    let legend_1 = `col=c(hsv(0, 1, 1)`
    let legend_2 = `pch=c(1`
    for (let i = 1, total = concentrations[0].length; i < total; i++) {
        graphs += `points(times, data[,${i+1}], col=hsv(${i/total}, 1, 1))` + '\n';
        legend_0 += `,"A_${i}"`;
        legend_1 += `,hsv(${i/total}, 1, 1)`;
        legend_2 += `,1`
    }
    let legend = legend_0 + '), ' + legend_1 + '), ' + legend_2 + '))\n';

    let script =
`#load file
data = read.csv(text="${data}")
times <- seq(from=0, to=${(concentrations.length - 2)* metaparameters.step_size}, by=${metaparameters.step_size})

maximum <- max(data)

png(filename = "concentrations.png");
${graphs}
${legend}
dev.off()
`

    fs.writeFile('concentrations.R', script, (err) => {
        if (err) throw err;
        else {
            console.log('generateConcentrationsGraph:', 'concentrations.R script created, attempting to run script');
            const run_script = spawn('Rscript', ['concentrations.R']);

            run_script.stdout.on('data', (data) => {
                console.log(`${data}`);
            });
              
            run_script.stderr.on('data', (data) => {
                console.error(`child stderr:\n${data}`);
            });

            run_script.on('exit', function (code, signal) {
                console.log(`"Rscript concentrations.R" exited with code ${code} and signal ${signal}`);
            });
        }
    })
}

/**
 * Takes in parameters and generates modeled data of absorbance during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size and time_length, which are in milliseconds
 * @param {Array} absorptivity is an array containing the absorptivities/molar attenuation coefficient (epsilon) of each species, ordered in increasing order of mass
 */
const generateModeledBeers = (initialConditions, n, forward, backward, metaparameters, absorptivity) => {
    let concentrations = generateModeledConcentrations(initialConditions, n, forward, backward, metaparameters);
    let beers_data = [];
    for (let i = 0; i < concentrations.length; i++) {
        beers_data[i] = 0;
        for (let j = 0, species = concentrations[i].length; j < species; j++) {
            beers_data[i] += absorptivity[j] * concentrations[i][j];
        }
    }
    return beers_data;
}

/**
 * Takes in parameters and writes to "beers.csv" the generated modeled data of absorbance during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size and time_length, which are in milliseconds
 * @param {Array} absorptivity is an array containing the absorptivities/molar attenuation coefficient (epsilon) of each species, ordered in increasing order of mass
 */
const printBeersCSV = (initialConditions, n, forward, backward, metaparameters, absorptivity) => {
    let absorbance = generateModeledBeers(initialConditions, n, forward, backward, metaparameters, absorptivity);
    // Print out output
    let csv = '';
    for (let i = 0; i < absorbance.length; i++) {
        csv += absorbance[i] + '\n';
    }
    fs.writeFile('beers.csv', csv, (err) => {
        if (err) throw err;
        console.log('printBeersCSV:', 'Absorbance data written to beers.csv');
    });
}

/**
 * Takes in parameters and draws a graph into "beers.png" from generated modeled data of absorbance during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size and time_length, which are in milliseconds
 * @param {Array} absorptivity is an array containing the absorptivities/molar attenuation coefficient (epsilon) of each species, ordered in increasing order of mass
 */
const generateBeersGraph = (initialConditions, n, forward, backward, metaparameters, absorptivity) => {
    let absorbance = generateModeledBeers(initialConditions, n, forward, backward, metaparameters, absorptivity);
    let data = '';
    for (let i = 0; i < absorbance.length; i++) {
        data += absorbance[i] + '\n';
    }
    data = data.substring(0, data.length - 1);

    let graphs = 'plot(times, data[,1], col=hsv(0, 1, 1), ylim=c(0, maximum), xlab="Time (s)", ylab="Absorbance (AU)")\n';

    let script =
`#load file
data = read.csv(text="${data}")
times <- seq(from=0, to=${(absorbance.length - 2)* metaparameters.step_size}, by=${metaparameters.step_size})

maximum <- max(data)

png(filename = "beers.png");
${graphs}
dev.off()
`

    fs.writeFile('beers.R', script, (err) => {
        if (err) throw err;
        else {
            console.log('generateBeersGraph:', 'beers.R script created, attempting to run script');
            const run_script = spawn('Rscript', ['beers.R']);

            run_script.stdout.on('data', (data) => {
                console.log(`${data}`);
            });
              
            run_script.stderr.on('data', (data) => {
                console.error(`child stderr:\n${data}`);
            });

            run_script.on('exit', function (code, signal) {
                console.log(`"Rscript beers.R" exited with code ${code} and signal ${signal}`);
            });
        }
    })
}


// Data output
printConcentrationsCSV(
    input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
        step_size: input.stepSize,
        time_length: input.timeLength
    }
);

generateConcentrationsGraph(
    input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
        step_size: input.stepSize,
        time_length: input.timeLength
    }
);

printBeersCSV(
    input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
        step_size: input.stepSize,
        time_length: input.timeLength
    }, input.absorptivity
);

generateBeersGraph(
    input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
        step_size: input.stepSize,
        time_length: input.timeLength
    }, input.absorptivity
);