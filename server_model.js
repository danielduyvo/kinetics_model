const fs = require('fs').promises; // for writing to file
const input = require('./inputData.js'); // parameters
const process = require("process") // for making the progress bar
const rdl = require("readline") // for making the progress bar


/**
 * Takes in parameters and generates a set of differential equations that describe the aggregation
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size, time_length, points and output_file
 * @param {Integer} nm is the mechanism representing how many monomers are involved in the slow step of nucleation
 */
const generateDiffEquations = async (n, forward, backward, metaparameters, nm = n) => {
    // Check if model parameters are valid
    if (forward.length != 3 || backward.length != 3) throw new Error("Incorrect number of rates")

    // Check if metaparameters are valid
    let { step_size, time_length, points, output_file } = metaparameters;
    if (step_size <= 0) throw new Error("Step size must be a positive number");
    if (time_length < step_size) throw new Error("Time length must be longer than step size");

    let diffEqs = (conditions) => {
        let next = [];
        let diff = 0;

        let k_a = forward[0]; // activation rate
        let k_am = backward[0]; // inactivation rate
        let k_n = forward[1]; // nucleation rate
        let k_nm = backward[1]; // denucleation rate
        let k_e = forward[2]; // elongation rate
        let k_em = backward[2]; // delongation rate

        // Calculating inactivated monomer concentration
        let i_m = conditions[0]; // unactivated monomer
        let a_m = conditions[1]; // activated monomer
        // Activation
        diff -= k_a * i_m;
        // Deactivation
        diff += k_am * a_m
        // Inactivated monomer
        next[0] = i_m + step_size * diff;

        diff = 0;

        // Calculating activated monomer concentration
        let A_1 = conditions[2];
        // Activation reaction
        // Activation
        diff += k_a * i_m;
        // Deactivation
        diff -= k_am * a_m;
        // Nucleation reaction
        // Nucleation
        diff -= n * k_n * Math.pow(a_m, nm)
        // Reverse
        diff += n * k_nm * A_1;
        for (let j = 3; j < conditions.length - 1; j++) { // Start with aggregate A_2
            // Monomer concentration decreases with the eleongation rate, dependent on M concentration and A_j concentration
            diff -= k_e * a_m * conditions[j];
            // Monomer concentration increase with the delongation rate, dependent on M concentration and A_j concentration
            diff += k_em * conditions[j + 1];
        }
        diff -= k_e * a_m * conditions[conditions.length - 1]; // Elongation rate of last aggregate
        // (no accompanying delongation since that refers to aggregate after this)
        // Activated monomer
        next[1] = a_m + step_size * diff;

        diff = 0;

        // Calculating first aggregate
        let A_2 = conditions[3];
        // Aggregate concentration increases with the nucleation rate, dependent on M concentration to the power of n
        diff += k_n * Math.pow(a_m, nm)
        // Aggregate concentration decreases with the reverse nucleation rate, dependent on A_1 concentration
        diff -= k_nm * A_1;
        // Aggregate concentration decreases with the elongation rate, dependent on M concentration and A_1 concentration
        diff -= k_e * a_m * A_1;
        // Aggregate concentration increases with the delongation rate, dependent on A_2 concentration
        diff += k_em * A_2;
        // First aggregate
        next[2] = A_1 + step_size * diff;

        // Calculate intermediate aggregates
        for (let i = 3; i < conditions.length - 1; i++) {
            diff = 0;
            let A_j = conditions[i]; // j = i-1
            let A_jm = conditions[i-1];
            let A_jp = conditions[i+1];
            // Aggregate concentration increases with the elongation rate, dependent on activated M concentration and A_j-1 concentration
            diff += k_e * a_m * A_jm
            // Aggregate concentration decreases with the delongation rate, dependent on A_j concentration
            diff -= k_em * A_j;
            // Aggregate concentration decreases with the elongation rate, dependent on activated M concentration and A_j concentration
            diff -= k_e * a_m * A_j;
            // Aggregate concentration increases with the delongation rate, dependent on A_j+1 concentration
            diff += k_em * A_jp;
            next[i] = A_j + diff * step_size;
        }

        diff = 0;

        // Calculate final aggregate
        let A_j = conditions[conditions.length - 1]; // j = i-1; last aggregate
        let A_jm = conditions[conditions.length - 2];
        // Aggregate concentration increases with the elongation rate, dependent on M concentration and A_i-1 concentration
        diff += k_e * a_m * A_jm;
        // Aggregate concentration decreases with the delongation rate, dependent on A_i concentration
        diff -= k_em * A_j;
        next[conditions.length - 1] = A_j + diff * step_size;
        
        diff = 0;

        // Calculate new aggregate
        // Aggregate concentration increases with the elongation rate, dependent on M concentration and A_i-1 concentration
        diff += k_e * a_m * A_j;
        next[conditions.length] = diff * step_size;
        return next;
    }
    return diffEqs; // Takes in a conditions array
}

/**
 * Takes in parameters and generates modeled data of concentrations during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size, time_length, points and output_file
 * @param {Integer} nm is the mechanism representing how many monomers are involved in the slow step of nucleation
 */
const generateModeledConcentrations = async (initialConditions, n, forward, backward, metaparameters, nm = n) => {
    let { step_size, time_length, points, output_file } = metaparameters;

    // Setup conditions array
    let conditions = [];
    for (let i = 0; i < initialConditions.length; i++) {
        conditions[i] = initialConditions[i];
    }

    // Setup results array
    let next = [];

    const diffEqs = await generateDiffEquations(n, forward, backward, metaparameters, nm = n);

    // Progress bar
    process.stdout.write("\x1B[?25l"); // erase cursor
    process.stdout.write("[");;
    for (let i = 0; i < 20; i++) {
        process.stdout.write("-")
    }
    process.stdout.write("]")
    rdl.moveCursor(process.stdout, -21, 0); // move cursor to beginning of bar
    let progressCounter = 0;
    // Picking out the intermediate points
    let pointCounter = 0;
    // Generate data
    let step = 0;
    // Initiate data array
    let data = [[step, ...conditions]];

    while (step < time_length) {
        next = diffEqs(conditions);
        for (let i = 0; i < next.length; i++) {
            conditions[i] = next[i];
        }
        while (true) {
            if (conditions[conditions.length - 1] == 0 && conditions.length > 4) conditions.pop();
            else break;
        }
        progressCounter++;
        if (progressCounter > (time_length / 20 / step_size)) { // update progress bar
            process.stdout.write("=");
            progressCounter = 1;
        }
        pointCounter++;
        if (pointCounter > time_length / points / step_size) { // add point to array
            data.push([step, ...conditions]);
            pointCounter = 0;
        }
        step += step_size;
    }
    data.push([step, ...conditions]); // add final concentrations
    rdl.moveCursor(process.stdout, -21, 1); // Move cursor to next line
    process.stdout.write("\x1B[?25h");
    return returned_data;
}

/**
 * Takes in parameters and generates modeled data of concentrations during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size, time_length, points and output_file
 * @param {Integer} nm is the mechanism representing how many monomers are involved in the slow step of nucleation
 */
const generateModeledMass = async (initialConditions, n, forward, backward, metaparameters, nm = n) => {
    let { step_size, time_length, points } = metaparameters;

    // Setup conditions array
    let conditions = [];
    for (let i = 0; i < initialConditions.length; i++) {
        conditions[i] = initialConditions[i];
    }

    // Setup results array
    let next = [];

    const diffEqs = await generateDiffEquations(n, forward, backward, metaparameters, nm = n);
    const calcMass = (conditions) => {
        let mass = 0;
        for (let i = 2; i < conditions.length; i++) {
            mass += conditions[i];
        }
        return mass;
    }

    // Progress bar
    process.stdout.write("\x1B[?25l"); // erase cursor
    process.stdout.write("[");;
    for (let i = 0; i < 20; i++) {
        process.stdout.write("-");
    }
    process.stdout.write("]");
    rdl.moveCursor(process.stdout, -21, 0); // move cursor to beginning of bar
    let progressCounter = 0;
    // Picking out the intermediate points
    let pointCounter = 0;
    // Generate data
    let step = 0;
    let mass = 0;
    // Initiate data array
    mass = calcMass(conditions);
    let data = [[step, mass]];

    while (step < time_length) {
        next = diffEqs(conditions);
        for (let i = 0; i < next.length; i++) {
            conditions[i] = next[i];
        }
        while (true) {
            if (conditions[conditions.length - 1] == 0 && conditions.length > 4) conditions.pop();
            else break;
        }
        progressCounter++;
        if (progressCounter > (time_length / 20 / step_size)) { // update progress bar
            process.stdout.write("=");
            progressCounter = 1;
        }
        pointCounter++;
        if (pointCounter > time_length / points / step_size) { // add point to array
            mass = calcMass(conditions);
            data.push([step, mass]);
            pointCounter = 0;
        }
        step += step_size;
    }
    mass = calcMass(conditions);
    data.push([step, mass]); // add final concentrations
    rdl.moveCursor(process.stdout, -21, 1); // Move cursor to next line
    process.stdout.write("\x1B[?25h");
    return data;
}

/**
 * Takes in parameters and prints out modeled data of concentrations during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size, time_length, points and output_file
 * @param {Integer} nm is the mechanism representing how many monomers are involved in the slow step of nucleation
 */
const printModeledConcentrations = async (initialConditions, n, forward, backward, metaparameters, nm = n) => {
    let { step_size, time_length, points, output_file } = metaparameters;

    // Setup conditions array
    let conditions = [];
    for (let i = 0; i < initialConditions.length; i++) {
        conditions[i] = initialConditions[i];
    }

    // Setup results array
    let next = [];

    const diffEqs = await generateDiffEquations(n, forward, backward, metaparameters, nm = n);

    // Progress bar
    process.stdout.write("\x1B[?25l"); // erase cursor
    process.stdout.write("[");;
    for (let i = 0; i < 20; i++) {
        process.stdout.write("-")
    }
    process.stdout.write("]")
    rdl.moveCursor(process.stdout, -21, 0); // move cursor to beginning of bar
    let progressCounter = 0;
    // Picking out the intermediate points
    let pointCounter = 0;
    // Generate data
    let step = 0;
    await fs.writeFile(output_file, [step, ...conditions]);
    while (step < time_length) {
        next = diffEqs(conditions);
        for (let i = 0; i < next.length; i++) {
            conditions[i] = next[i];
        }
        while (true) {
            if (conditions[conditions.length - 1] == 0 && conditions.length > 4) conditions.pop();
            else break;
        }
        progressCounter++;
        if (progressCounter > (time_length / 20 / step_size)) { // update progress bar
            process.stdout.write("=");
            progressCounter = 1;
        }
        pointCounter++;
        if (pointCounter > time_length / points / step_size) { // add point to array
            await fs.appendFile(output_file, '\n' + [step, ...conditions]);
            pointCounter = 0;
        }
        step += step_size;
    }
    await fs.appendFile(output_file, '\n' + [step, ...conditions]); // add final concentrations
    rdl.moveCursor(process.stdout, -21, 1); // Move cursor to next line
    process.stdout.write("\x1B[?25h")
    return;
}

/**
 * Takes in parameters and prints out modeled aggregate mass during an aggregation
 * @param {Array} initialConditions is an array of initial concentrations for the monomers and the aggregates, starting from the monomer and the aggregates in increasing mass order
 * @param {Integer} n is the coefficient of the monomers in the first aggregation mechanism
 * @param {Array} forward is an array of rate constants, ordered in increasing order of the products
 * @param {Array} backward is an array of rate constants, ordered in increasing order of the products
 * @param {Object} metaparameters is an object with keys step_size, time_length, points and output_file
 * @param {Integer} nm is the mechanism representing how many monomers are involved in the slow step of nucleation
 */
const printModeledMass = async (initialConditions, n, forward, backward, metaparameters, nm = n) => {
    let { step_size, time_length, points, output_file } = metaparameters;

    // Setup conditions array
    let conditions = [];
    for (let i = 0; i < initialConditions.length; i++) {
        conditions[i] = initialConditions[i];
    }

    // Setup results array
    let next = [];

    const diffEqs = await generateDiffEquations(n, forward, backward, metaparameters, nm = n);
    const calcMass = async (conditions) => {
        let sum = 0;
        for (let i = 2; i < conditions.length; i++) {
            sum += conditions[i];
        }
        return sum;
    }

    // Progress bar
    process.stdout.write("\x1B[?25l"); // erase cursor
    process.stdout.write("[");;
    for (let i = 0; i < 20; i++) {
        process.stdout.write("-")
    }
    process.stdout.write("]")
    rdl.moveCursor(process.stdout, -21, 0); // move cursor to beginning of bar
    let progressCounter = 0;
    // Picking out the intermediate points
    let pointCounter = 0;
    // Generate data
    let step = 0;
    let mass = await calcMass(conditions);
    await fs.writeFile(output_file, [step, mass]);
    while (step < time_length) {
        next = diffEqs(conditions);
        for (let i = 0; i < next.length; i++) {
            conditions[i] = next[i];
        }
        while (true) {
            if (conditions[conditions.length - 1] == 0 && conditions.length > 4) conditions.pop();
            else break;
        }
        progressCounter++;
        if (progressCounter > (time_length / 20 / step_size)) { // update progress bar
            process.stdout.write("=");
            progressCounter = 1;
        }
        pointCounter++;
        if (pointCounter > time_length / points / step_size) { // add point to array
            mass = await calcMass(conditions);
            await fs.appendFile(output_file, '\n' + [step, mass]);
            pointCounter = 0;
        }
        step += step_size;
    }
    mass = await calcMass(conditions);
    await fs.appendFile(output_file, '\n' + [step, mass]); // add final concentrations
    rdl.moveCursor(process.stdout, -21, 1); // Move cursor to next line
    process.stdout.write("\x1B[?25h")
    return;
}

module.exports = {
    generate: async (initialConditions, n, forward, backward, metaparameters, nm = n) => {
        await printModeledConcentrations(initialConditions, n, forward, backward, metaparameters, nm = n);
        return;
    },
    generate_modeled_mass: async (initialConditions, n, forward, backward, metaparameters, nm = n) => {
        return generateModeledMass(initialConditions, n, forward, backward, metaparameters, nm = n);
    },
    local_concentration: async () => {
        // Generate model from local parameters
        console.log(input);
        await printModeledConcentrations(
            input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
                step_size: input.step_size,
                time_length: input.time_length,
                points: input.points,
                output_file: input.output_file
            }
        );
        return;
    },
    generateData: async (initialConditions, n, forward, backward, metaparameters, nm = n) => {
        return generateModeledConcentrations(initialConditions, n, forward, backward, metaparameters, nm = n);
    },
    local_aggregate_mass: async () => {
        // Generate model from local parameters
        console.log(input);
        await printModeledMass(
            input.initialConditions, input.n, input.forwardRates, input.backwardRates, {
                step_size: input.step_size,
                time_length: input.time_length,
                points: input.points,
                output_file: input.output_file
            }
        );
        return;
    }
}
