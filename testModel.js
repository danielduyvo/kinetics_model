// Old model, hardcoded to test out the math

const testModelFunction = () => {
    // initial conditions
    let M_0 = 1;
    let A_1 = 0;
    let A_2 = 0;

    // parameters
    let n = 1;
    let k_1 = .01;
    let k_1m = .01;
    let k_2 = .001;
    let k_2m = .001;

    // generate array of concentrations
    let model = {
        M: [M_0],
        A_1: [A_1],
        A_2: [A_2]
    }

    for (let i = 0; i < 1000; i++) {
        // Save last condition into variables
        let oM = model.M[i];
        let oA_1 = model.A_1[i];
        let oA_2 = model.A_2[i];

        // Calculate differences
        let dnM = k_1m * oA_1 - k_1 * Math.pow(oM, n) - k_2 * oM * oA_2;
        let dnA_1 = k_1 * Math.pow(oM, n) + k_2m * oA_2 - k_1m * oA_1 - k_2 * oM * oA_1;
        let dnA_2 = k_2 * oM * oA_1 - k_2m * oA_2;

        // Push new condition
        model.M.push(oM + dnM);
        model.A_1.push(oA_1 + dnA_1);
        model.A_2.push(oA_2 + dnA_2);
    }
    return model;
}

let model = testModelFunction();
let M = model.M.join(',');
let A_1 = model.A_1.join(',');
let A_2 = model.A_2.join(',');

fs.writeFile('data.csv', M + '\n' + A_1 + '\n' + A_2 + '\n', (err) => {
    if (err) throw err;
    console.log('data saved');
})