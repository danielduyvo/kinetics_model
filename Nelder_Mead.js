const params = require(__dirname + '/NelderMeadParams.js');
const model = require(__dirname + '/server_model.js');
const fs = require('fs').promises;

const MSE = async (real_data, modeled_data) => {
    let errors = 0;
    for (let i = 0; i < real_data.length; i++) {
        let time = real_data[i][0];
        let model_indices = binarySearch(modeled_data, time);
        let modeled_value = (modeled_data[modeled_indices[0]][1] + modeled_data[modeled_indices[1]][1]) / 2;
        let error = real_data[i][1] - modeled_value;
        errors += Math.pow(error, 2);
    }
    let mse = errors / real_data.length;
    return mse;
}

const isPositive = async (params) => {
    if (n < 0) return false;
    for (let i = 0; i < forwardRates.length; i++) {
        if (forwardRates[i] < 0) return false;
    }
    for (let j = 0; j < backwardRates.length; j++) {
        if (backwardRates[j] < 0) return false;
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

const binarySearch = async (arr, time) => {
    let L = 0;
    let R = arr.length - 1;
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
    let data = await model.generateData(
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
    data = calculateAggregateMass(data);
    let error = 0;
    if (isPositive(params)) {
        error = MSE(real_data, data);
    } else {
        error = Infinity;
    }
    return error;
}

const Nelder_Mead = async (real_data, param_arr, constants) => {
    let guesses = [];
    for (let i = 0; i < param_arr.length; i++) {
        let params = param_arr[i];
        let solution = await model.generateData(
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

        let aggregateMass = calculateAggregateMass(solution);
        let error = 0;

        if (isPositive(params)) {
            error = MSE(real_data, aggregateMass);
        } else {
            error = Infinity;
        }

        guesses.push( JSON.parse(JSON.stringify(params)), error );
    }

    for (let i = 0; i < 100; i++) {
        guesses.sort((a,b) => a[1] - b[1]); // Sort in ascending order
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
        let temp;
        // Reflect point
        let reflection = JSON.parse(JSON.stringify(centroid));
        temp = subParams(centroid, guesses[guesses.length - 1][0]);
        reflection = addParams(reflection, temp);
        let refl_error = calcDataError(reflection, constants, real_data);
        if (refl_error < guesses[guesses.length - 1][1] && refl_error > guesses[0][1]) { // Reflection is not bad
            guesses[guesses.length - 1][0] = JSON.parse(JSON.stringify(reflection));
            guesses[guesses.length - 1][1] = refl_error;
            continue;
        } else if (refl_error <= guesses[0][1]) { // Reflection is really good, try expanding
            let expansion = JSON.parse(JSON.stringify(centroid));
            temp = multScalar(2, subParams(reflection, centroid));
            expansion = addParams(expansion, temp);
            let expa_error = calcDataError(expansion, constants, real_data);
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
        let cont1_error = calcDataError(contraction1, constants, real_data);
        let contraction2 = JSON.parse(JSON.stringify(centroid));
        temp = multScalar(0.5, subParams(reflection, centroid));
        contraction2 = addParams(contraction2, temp);
        let cont2_error = calcDataError(contraction2, constants, real_data);
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
    return guesses;
}

const runNelderMead = async (real_file, param_arr, constants) => {
    let real_data = await fs.readFile(__dirname + '/' + real_file);
    real_data = real_data.toString('utf8');
    real_data = file.split('\n');
    for (let i = 0; i < real_data.length; i++) {
        let temp = real_data.split(',');
        real_data[i] = [parseInt(temp[0]), parseInt(temp[1])];
    }
    return await Nelder_Mead(real_data, param_arr, constants);
}

console.log(runNelderMead('data.csv', params.param_arr, params.constants));

