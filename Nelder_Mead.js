const params = require(__dirname + '/NelderMeadParams.js');
const globalParams = require(__dirname + '/globalParams.js');
const model = require(__dirname + '/server_model.js');
const fs = require('fs').promises;

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

const normalizeData = async (data, time) => {
    let modeled_indices = await binarySearch(data, time);
    let modeled_value = (data[modeled_indices[0]][1] + data[modeled_indices[1]][1]) / 2;
    for (let i = 0; i < data.length; i++) {
        data[i][1] = data[i][1] / modeled_value;
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
    if (await isPositive(params)) {
        let data = await model.generate_modeled_mass(
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
        data = await normalizeData(data, real_data[real_data.length - 1][0]);
        error = await MSE(real_data, data);
    } else {
        error = Infinity;
    }
    console.log("MSE:", error);
    return error;
}

const Nelder_Mead = async (real_data, param_arr, constants) => {
    real_data = await normalizeData(real_data, real_data[real_data.length - 1][0]);
    let guesses = [];
    for (let i = 0; i < param_arr.length; i++) {
        let params = param_arr[i];
        let aggregateMass = await model.generate_modeled_mass(
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
    for (let i = 0; i < 10; i++) {
        guesses.sort((a,b) => a[1] - b[1]); // Sort in ascending order
        console.log("Ordered guesses");
        for (let i = 0; i < guesses.length; i++) {
            console.log(i, guesses[i]);
        }
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
    real_data = real_data.toString('utf8');
    real_data = real_data.split('\n');
    if (real_data[real_data.length - 1] == "") {
        real_data.pop();
    }
    for (let i = 0; i < real_data.length; i++) {
        let temp = real_data[i].split(',');
        real_data[i] = [parseInt(temp[0]), parseInt(temp[1])];
    }
    console.log('Data has been read in');
    return (await Nelder_Mead(real_data, param_arr, constants));
}

const calcGlobalDataError = async (params, constants, real_data) => {
    let error = 0;
    for (let i = 0; i < constants.length; i++) {
        if (await isPositive(params)) {
            let data = await model.generate_modeled_mass(
                constants[i].initialConditions,
                params.n,
                params.forwardRates,
                params.backwardRates,
                {
                    step_size: constants[i].step_size,
                    time_length: constants[i].time_length,
                    points: constants[i].points,
                }
            );
            data = await normalizeData(data, real_data[i][real_data[i].length - 1][0]);
            error += await MSE(real_data[i], data);
        } else {
            error = Infinity;
        }
    }
    error = error / constants.length;
    console.log("MSE:", error);
    return error;
}

const globalFit = async (real_data, param_arr, constants) => {
    let last_times = [];
    for (let i = 0; i < real_data.length; i++) {
        last_times[i] = real_data[i][real_data[i].length - 1][0];
        real_data[i] = await normalizeData(real_data[i], real_data[i][real_data[i].length - 1][0]);
    }
    let guesses = [];
    for (let i = 0; i < param_arr.length; i++) {
        let params = param_arr[i];
        let error = 0;

        for (let i = 0; i < constants.length; i++) {
            console.log("Generating model for dataset #", i + 1);
            let aggregateMass = await model.generate_modeled_mass(
                constants[i].initialConditions,
                params.n,
                params.forwardRates,
                params.backwardRates,
                {
                    step_size: constants[i].step_size,
                    time_length: constants[i].time_length,
                    points: constants[i].points,
                }
            );

            if (isPositive(params)) {
                error += await MSE(real_data[i], aggregateMass);
            } else {
                error = Infinity;
                break;
            }
        }
        error = error / constants.length;

        guesses.push( [JSON.parse(JSON.stringify(params)), error] );
    }
    console.log("Params have been read and their masses and errors calculated");
    for (let i = 0; i < 100; i++) {
        guesses.sort((a,b) => a[1] - b[1]); // Sort in ascending order
        console.log("Ordered guesses");
        for (let i = 0; i < guesses.length; i++) {
            console.log(i, guesses[i]);
        }
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
        let refl_error = await calcGlobalDataError(reflection, constants, real_data);
        if (refl_error < guesses[guesses.length - 1][1] && refl_error > guesses[0][1]) { // Reflection is not bad
            guesses[guesses.length - 1][0] = JSON.parse(JSON.stringify(reflection));
            guesses[guesses.length - 1][1] = refl_error;
            continue;
        } else if (refl_error <= guesses[0][1]) { // Reflection is really good, try expanding
            let expansion = JSON.parse(JSON.stringify(centroid));
            temp = multScalar(2, subParams(reflection, centroid));
            expansion = addParams(expansion, temp);
            console.log("Expansion", expansion);
            let expa_error = await calcGlobalDataError(expansion, constants, real_data);
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
        let cont1_error = await calcGlobalDataError(contraction1, constants, real_data);
        let contraction2 = JSON.parse(JSON.stringify(centroid));
        temp = multScalar(0.5, subParams(reflection, centroid));
        contraction2 = addParams(contraction2, temp);
        console.log("Contraction (outside)", contraction2);
        let cont2_error = await calcGlobalDataError(contraction2, constants, real_data);
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

const runGlobalFit = async (real_file, param_arr, constants) => {
    let real_data = await fs.readFile(__dirname + '/' + real_file);
    real_data = real_data.toString('utf8');
    real_data = real_data.split('>'); // Separate different assays with >
    if (real_data[real_data.length - 1] == "") {
        real_data.pop();
    }
    for (let i = 0; i < real_data.length; i++) {
        real_data[i] = real_data[i].split('\n');
        if (real_data[i][real_data[i].length - 1] == "") {
            real_data[i].pop();
        }
        for (let j = 0; j < real_data[i].length; j++) {
            let temp = real_data[i][j].split(',');
            real_data[i][j] = [parseInt(temp[0]), parseInt(temp[1])];
        }
    }
    console.log('Real data', real_data);
    console.log('Data has been read in');
    return (await globalFit(real_data, param_arr, constants));
}

// console.log("Done:", runNelderMead('data.csv', params.param_arr, params.constants));
console.log("Done:", runGlobalFit('globaldata.csv', globalParams.param_arr, globalParams.constants));
