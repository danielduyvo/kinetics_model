// Model
// [M_0] <=> [M], rate constants k_a and k_0a
// n[M] <=> [A_1], rate constants k_0 and k_0m
// [M] + [A_i] <=> [A_(i+1)], rate constants k_i and k_im
// d[M]/dt = + k_0m*n*[A_1] - k_0*[M]^n - sum of i from 1 to j ( k_(i)*[M]*[A_i] )
// d[A_1]/dt = + k_0*[M]^n + k_em*[A_2] - k_0m*[A_1] - k_e*[M]*[A_1]
// d[A_i]/dt = + k_e*[M]*[A_(i-1)] + k_em*[A_(i+1)] - k_em*[A_i] - k_e*[M]*[A_i]

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
 * @param {Integer} nm is the mechanism representing how many monomers are involved in the slow step of nucleation
 */
const generateModeledConcentrations = (initialConditions, n, forward, backward, metaparameters, nm = n) => {
    // Check if model parameters are valid
    if (forward.length != 3 || backward.length != 3) throw new Error("Incorrect number of rates")
    
    // Check if metaparameters are valid
    let { step_size, time_length } = metaparameters;
    if (step_size <= 0) throw new Error("Step size must be a positive number");
    if (time_length < step_size) throw new Error("Time length must be longer than step size");

    // Setup conditions array
    let conditions = [];
    for (let i = 0; i < initialConditions.length; i++) {
        conditions[i] = initialConditions[i];
    }

    for (let i = 0; i < time_length/step_size - initialConditions.length + 1; i++) {
        conditions.push(0);
    }

    // Setup results array
    let results = [[]];
    for (let i = 0; i < conditions.length; i++) {
        results[0][i] = conditions[i];
    }

    // Generate model functions
    let diffEqs = [];

    // Unactivated monomer differential equation
    diffEqs.push(() => {
        let k_a = forward[0];
        let k_am = backward[0];
        let u_m = conditions[0]; // unactivated monomer
        let a_m = conditions[1]; // activated monomer

        let diff = 0;
        // Activation
        diff -= k_a * u_m;
        // Deactivation
        diff += k_am * a_m
        return diff;
    })

    // Activated monomer differential equation
    diffEqs.push(() => {
        let k_a = forward[0];
        let k_am = backward[0];
        let u_m = conditions[0]; // unactivated monomer
        let a_m = conditions[1]; // activated monomer

        let k_n = forward[1]; // nucleation rate
        let k_nm = backward[1]; // denucleation rate
        let A_1 = conditions[2];

        let k_e = forward[2]; // elongation rate
        let k_em = backward[2]; // delongation rate

        let diff = 0;

        // Activation reaction
        // Activation
        diff += k_a * u_m;
        // Deactivation
        diff -= k_am * a_m;

        // Nucleation reaction
        // Nucleation
        diff -= n * k_n * Math.pow(a_m, nm)
        // Reverse
        diff += k_nm * A_1;

        // Monomer concentration decreases with the eleongation rate, dependent on M concentration and A_j concentration
        // Monomer concentration increase with the delongation rate, dependent on M concentration and A_j concentration
        for (let j = 3; j < conditions.length - 1; j++) { // Start with aggregate A_2
            diff -= k_e * a_m * conditions[j];
            diff += k_em * conditions[j + 1];
        }

        return diff;
    })

    // First aggregate differential equation
    diffEqs.push(() => {
        let a_m = conditions[1]; // activated monomer

        let k_n = forward[1]; // nucleation rate
        let k_nm = backward[1]; // reverse nucleation rate
        let A_1 = conditions[2];
        
        let k_e = forward[2]; // elongation rate
        let k_em = backward[2]; // delongation rate
        let A_2 = conditions[3];

        let diff = 0;

        // Aggregate concentration increases with the nucleation rate, dependent on M concentration to the power of n
        diff = k_n * Math.pow(a_m, nm)
        // Aggregate concentration decreases with the reverse nucleation rate, dependent on A_1 concentration
        diff -= k_nm * A_1;

        // Aggregate concentration decreases with the elongation rate, dependent on M concentration and A_1 concentration
        diff -= k_e * a_m * A_1;
        // Aggregate concentration increases with the delongation rate, dependent on A_2 concentration
        diff += k_em * A_2;
        return diff;
    })

    // Aggregate differential equations
    for (let i = 3; i < conditions.length - 1; i++) { // conditions[i] = A_(i-1)
        diffEqs.push(() => {
            let a_m = conditions[1]; // activated monomer

            let A_j = conditions[i]; // j = i-1
            let A_jm = conditions[i-1];
            let A_jp = conditions[i+1];

            let k_e = forward[1]; // elongation rate
            let k_em = backward[1]; // reverse elongation rate

            let diff = 0;

            // Aggregate concentration increases with the elongation rate, dependent on activated M concentration and A_j-1 concentration
            diff += k_e * a_m * A_jm
            // Aggregate concentration decreases with the delongation rate, dependent on A_j concentration
            diff -= k_em * A_j;

            // Aggregate concentration decreases with the association rate, dependent on activated M concentration and A_j concentration
            diff -= k_e * a_m * A_j;
            // Aggregate concentration increases with the dissociation rate, dependent on A_j+1 concentration
            diff += k_em * A_jp;
            return diff;
        })
    }

    // Final aggregate differential equation
    diffEqs.push(() => {
        let a_m = conditions[1]; // activated monomer

        let A_j = conditions[conditions.length - 1]; // j = i-1; last aggregate
        let A_jm = conditions[conditions.length - 2];

        let k_e = forward[1]; // elongation rate
        let k_em = backward[1]; // reverse elongation rate

        let diff = 0;
        // Aggregate concentration increases with the association rate, dependent on M concentration and A_i-1 concentration
        diff += k_e * a_m * A_jm;
        // Aggregate concentration decreases with the dissociation rate, dependent on A_i concentration
        diff -= k_em * A_j;
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
 * Takes in parameters and creates a graph of the concentrations into 'concentrations.png' from generated modeled data of absorbance during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size and time_length, which are in milliseconds
 */
const generateShortConcentrationsGraph = (initialConditions, n, forward, backward, metaparameters) => {
    let concentrations = generateModeledConcentrations(initialConditions, n, forward, backward, metaparameters);
    let data = '';
    for (let i = 0; i < concentrations.length; i++) {
        data += concentrations[i].join(',') + '\n';
    }
    let graphs = 'plot(times, data[,1], col=hsv(0, 1, 1), ylim=c(0, maximum), xlab="Time (s)", ylab="Molarity (M)")\n';
    let legend_0 = `legend("top", legend = c("iM"`;
    let legend_1 = `col=c(hsv(0, 1, 1)`
    let legend_2 = `pch=c(1`
    for (let i = 1, total = 5; i < total; i++) { // instead of concentrations[0].length
        graphs += `points(times, data[,${i+1}], col=hsv(${i/total}, 1, 1))` + '\n';
        if (i == 1) legend_0 += `,"aM"` 
        else legend_0 += `,"A_${i - 1}"`;
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
 * Takes in parameters and creates a graph of the concentrations into 'concentrations.png' from generated modeled data of absorbance during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size and time_length, which are in milliseconds
 */
const generateMultConcentrationsGraphs = (initialConditions, n, forward, backward, metaparameters) => {
    let concentrations = generateModeledConcentrations(initialConditions, n, forward, backward, metaparameters);
    let data = '';
    for (let i = 0; i < concentrations.length; i++) {
        data += concentrations[i].join(',') + '\n';
    }
    let graphs = 'plot(times, data[,1], col=hsv(0, 1, 1), ylim=c(0, maximum), xlab="Time (s)", ylab="Molarity (M)")\n';
    let legend_0 = `legend("top", legend = c("iM"`;
    let legend_1 = `col=c(hsv(0, 1, 1)`
    let legend_2 = `pch=c(1`
    for (let i = 1, total = 5; i < total; i++) { // instead of concentrations[0].length
        graphs += `points(times, data[,${i+1}], col=hsv(${i/total}, 1, 1))` + '\n';
        if (i == 1) legend_0 += `,"aM"` 
        else legend_0 += `,"A_${i - 1}"`;
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

png(filename = "A1.png");
plot(times, data[,3], xlab = "Time (s)", ylab = "Molarity");
dev.off()

png(filename = "A6.png");
plot(times, data[,9], xlab = "Time (s)", ylab = "Molarity");
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
const generateModeledBeers = (initialConditions, n, forward, backward, metaparameters, absorptivity_function) => {
    let concentrations = generateModeledConcentrations(initialConditions, n, forward, backward, metaparameters);
    let beers_data = [];
    let absorptivity = [];
    for (let i = 0, species = concentrations[0].length; i < species; i++) {
        absorptivity.push(absorptivity_function(i));
    }
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

// const absorptivity = (reactant) => {
//     if (reactant == 1) reactant = 0;
//     if (reactant == 0) return 0;
//     return 1;
// }

// Data output
printConcentrationsCSV(
    input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
        step_size: input.stepSize,
        time_length: input.timeLength
    }
);

// generateShortConcentrationsGraph(
//     input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
//         step_size: input.stepSize,
//         time_length: input.timeLength
//     }
// );

// generateMultConcentrationsGraphs(
//     input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
//         step_size: input.stepSize,
//         time_length: input.timeLength
//     }
// );

// generateConcentrationsGraph(
//     input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
//         step_size: input.stepSize,
//         time_length: input.timeLength
//     }
// );

// printBeersCSV(
//     input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
//         step_size: input.stepSize,
//         time_length: input.timeLength
//     }, absorptivity
// );

// generateBeersGraph(
//     input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
//         step_size: input.stepSize,
//         time_length: input.timeLength
//     }, absorptivity
// );
