// Model
// [M_0] <=> [M], rate constants k_a and k_0a
// n[M] <=> [A_1], rate constants k_0 and k_0m
// [M] + [A_i] <=> [A_(i+1)], rate constants k_i and k_im
// d[M]/dt = + k_0m*n*[A_1] - k_0*[M]^n - sum of i from 1 to j ( k_(i)*[M]*[A_i] )
// d[A_1]/dt = + k_0*[M]^n + k_em*[A_2] - k_0m*[A_1] - k_e*[M]*[A_1]
// d[A_i]/dt = + k_e*[M]*[A_(i-1)] + k_em*[A_(i+1)] - k_em*[A_i] - k_e*[M]*[A_i]

const fs = require('fs');
const input = require('./inputData.js');

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
        diff -= k_e * a_m * conditions[length - 1]; // Elongation rate of last aggregate
        // (no accompanying delongation since that refers to aggregate after this)

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
    let {points} = metaparameters;
    // Print out output
    let csv = '';
    for (let i = 0, skip = Math.floor(model.length/points); i < model.length; i = i + skip) {
        csv += model[i].join(',') + '\n';
    }
    fs.writeFile('concentrations.csv', csv, (err) => {
        if (err) throw err;
        console.log('printConcentrationsCSV:', 'Concentration data written to concentrations.csv');
    });
}

// Data output
printConcentrationsCSV(
    input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
        step_size: input.stepSize,
        time_length: input.timeLength,
        points: input.points
    }
);
