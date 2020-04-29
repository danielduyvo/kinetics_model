const params = require(__dirname + '/NelderMeadParams.js');
const model = require(__dirname + '/server_model.js');
const fs = require('fs').promises;

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
const generateModeledMass = async (initialConditions, n, forward, backward, metaparameters, nm = n) => {
    let { step_size, time_length, points, output_file } = metaparameters;

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
    return data;
}

const binarySearch = async (arr, time) => {
    let L = 0;
    let R = arr.length - 1;
    let m = Math.floor((L + R) / 2);
    while (L <= R) {
        m = Math.floor((L + R) / 2);
        if (arr[m][0] < time) {
            L = m + 1;
        } else if (arr[m][0] > time) {
            R = m - 1;
        } else return [m,m]
    }
    return [R, L];
}

const MSE = async (real_data, modeled_data) => {
    let errors = 0;
    for (let i = 0; i < real_data.length; i++) {
        let time = real_data[i][0];
        let modeled_indices = await binarySearch(modeled_data, time);
        let modeled_value = (modeled_data[modeled_indices[0]][1] + modeled_data[modeled_indices[1]][1]) / 2;
        let error = real_data[i][1] - modeled_value;
        errors += Math.pow(error, 2);
    }
    let mse = errors / real_data.length;
    return mse;
}

const isPositive = async (params) => {
    if (params.n < 0) return false;
    for (let i = 0; i < params.forwardRates.length; i++) {
        if (params.forwardRates[i] < 0) return false;
    }
    for (let j = 0; j < params.backwardRates.length; j++) {
        if (params.backwardRates[j] < 0) return false;
    }
    return true;
}

const calculateAggregateMass = async (data) => {
    let masses = [];
    for (let i = 0; i < data.length; i++) {
        let temp = data[i];
        let mass = 0;
        for (let j = 1; j < temp.length; j++) {
            mass += temp[j];
        }
        masses.push([temp[0], mass]);
    }
    return mass;
}

const normalizeData = async (data) => {
    let last_fluor = data[data.length - 1][1];
    for (let i = 0; i < data.length; i++) {
        data[1] = data[1] / last_fluor;
    }
    return data;
}

const addParams = (a, b) => {
    let sum = {
        n: 0,
        forwardRates: [0, 0, 0],
        backwardRates: [0, 0, 0],
    }
    sum.n = a.n + b.n;
    for (let i = 0; i < 3; i++) {
        sum.forwardRates[i] = a.forwardRates[i] + b.forwardRates[i];
        sum.backwardRates[i] = a.backwardRates[i] + b.backwardRates[i];
    }
    return sum;
}

const subParams = (a, b) => {
    let sum = {
        n: 0,
        forwardRates: [0, 0, 0],
        backwardRates: [0, 0, 0],
    }
    sum.n = a.n - b.n;
    for (let i = 0; i < 3; i++) {
        sum.forwardRates[i] = a.forwardRates[i] - b.forwardRates[i];
        sum.backwardRates[i] = a.backwardRates[i] - b.backwardRates[i];
    }
    return sum;
}

const multScalar = (scalar, a) => {
    let sum = {
        n: 0,
        forwardRates: [0, 0, 0],
        backwardRates: [0, 0, 0],
    }
    sum.n = scalar * a.n;
    for (let i = 0; i < 3; i++) {
        sum.forwardRates[i] = scalar * a.forwardRates[i];
        sum.backwardRates[i] = scalar * a.backwardRates[i];
    }
    return sum;
}

const calcDataError = async (params, constants, real_data) => {
    let error = 0;
    if (isPositive(params)) {
        let data = await generateModeledMass(
            constants.initialConditions,
            params.n,
            params.forwardRates,
            params.backwardRates,
            {
                step_size: constants.step_size,
                time_length: constants.time_length,
                points: constants.points,
            }
        );
        error = await MSE(real_data, data);
    } else {
        error = Infinity;
    }
    console.log("MSE:", error);
    return error;
}

const Nelder_Mead = async (real_data, param_arr, constants) => {
    let guesses = [];
    for (let i = 0; i < param_arr.length; i++) {
        let params = param_arr[i];
        let aggregateMass = await generateModeledMass(
            constants.initialConditions,
            params.n,
            params.forwardRates,
            params.backwardRates,
            {
                step_size: constants.step_size,
                time_length: constants.time_length,
                points: constants.points,
            }
        );

        let error = 0;

        if (isPositive(params)) {
            error = await MSE(real_data, aggregateMass);
        } else {
            error = Infinity;
        }

        guesses.push( [JSON.parse(JSON.stringify(params)), error] );
    }
    console.log("Params have been read and their masses and errors calculated");
    for (let i = 0; i < 100; i++) {
        guesses.sort((a,b) => a[1] - b[1]); // Sort in ascending order
        ("Ordered guesses", guesses);
        // Find the centroid
        let centroid = {
            n: 0,
            forwardRates: [0, 0, 0],
            backwardRates: [0, 0, 0]
        };
        for (let j = 0; j < guesses.length - 1; j++) {
            centroid.n += guesses[j][0].n;
            for (let k = 0; k < 3; k++) {
                centroid.forwardRates[k] += guesses[j][0].forwardRates[k];
                centroid.backwardRates[k] += guesses[j][0].backwardRates[k];
            }
        }
        centroid.n /= (guesses.length - 1);
        for (let j = 0; j < 3; j++) {
            centroid.forwardRates[j] /= (guesses.length - 1);
            centroid.backwardRates[j] /= (guesses.length - 1);
        }
        console.log("Centroid", centroid);
        let temp;
        // Reflect point
        let reflection = JSON.parse(JSON.stringify(centroid));
        temp = subParams(centroid, guesses[guesses.length - 1][0]);
        reflection = addParams(reflection, temp);
        console.log("Reflection", reflection);
        let refl_error = await calcDataError(reflection, constants, real_data);
        if (refl_error < guesses[guesses.length - 1][1] && refl_error > guesses[0][1]) { // Reflection is not bad
            guesses[guesses.length - 1][0] = JSON.parse(JSON.stringify(reflection));
            guesses[guesses.length - 1][1] = refl_error;
            continue;
        } else if (refl_error <= guesses[0][1]) { // Reflection is really good, try expanding
            let expansion = JSON.parse(JSON.stringify(centroid));
            temp = multScalar(2, subParams(reflection, centroid));
            expansion = addParams(expansion, temp);
            console.log("Expansion", expansion);
            let expa_error = await calcDataError(expansion, constants, real_data);
            if (expa_error < refl_error) {
                guesses[guesses.length - 1][0] = JSON.parse(JSON.stringify(expansion));
                guesses[guesses.length - 1][1] = expa_error;
            } else {
                guesses[guesses.length - 1][0] = JSON.parse(JSON.stringify(reflection));
                guesses[guesses.length - 1][1] = refl_error;
            }
            continue;
        }
        // Reflection is bad, try contraction instead
        let contraction1 = JSON.parse(JSON.stringify(centroid));
        temp = multScalar(0.5, subParams(guesses[guesses.length - 1][0], centroid));
        contraction1 = addParams(contraction1, temp);
        console.log("Contraction (inside)", contraction1);
        let cont1_error = await calcDataError(contraction1, constants, real_data);
        let contraction2 = JSON.parse(JSON.stringify(centroid));
        temp = multScalar(0.5, subParams(reflection, centroid));
        contraction2 = addParams(contraction2, temp);
        console.log("Contraction (outside)", contraction2);
        let cont2_error = await calcDataError(contraction2, constants, real_data);
        if (cont1_error < guesses[guesses.length - 1][1]) {
            if (cont1_error < cont2_error) {
                guesses[guesses.length - 1][0] = JSON.parse(JSON.stringify(contraction1));
                guesses[guesses.length - 1][1] = cont1_error;
            } else {
                guesses[guesses.length - 1][0] = JSON.parse(JSON.stringify(contraction2));
                guesses[guesses.length - 1][1] = cont2_error;
            }
            continue;
        } else if (cont2_error < guesses[guesses.length - 1][1]) {
            guesses[guesses.length - 1][0] = JSON.parse(JSON.stringify(contraction2));
            guesses[guesses.length - 1][1] = cont2_error;
            continue;
        }
        // Contractions are bad, shrink instead
        for (let s = 1, best = guesses[0][0]; s < guesses.length; s++) {
            temp = multScalar(0.5, subParams(guesses[s][0], best));
            temp = addParams(best, temp);
            guesses[s][0] = JSON.parse(JSON.stringify(temp));
        }
        continue;
    }
    guesses.sort((a,b) => a[1] - b[1]); // Sort in ascending order
    console.log("Final guesses", JSON.stringify(guesses));
    return guesses;
}

const runNelderMead = async (real_file, param_arr, constants) => {
    let real_data = await fs.readFile(__dirname + '/' + real_file);
    real_data = real_data.toString('utf8').split('\n');
    for (let i = 0; i < real_data.length; i++) {
        let temp = real_data[i].split(',');
        real_data[i] = [parseInt(temp[0]), parseInt(temp[1])];
    }
    console.log('Data has been read in');
    return (await Nelder_Mead(real_data, param_arr, constants));
}

console.log("Done:", runNelderMead('data.csv', params.param_arr, params.constants));

