module.exports = {
    initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
        .000120, 0, 0, 0
    ],
    n: 4.6, // Number of monomers it takes to make the first aggregate
    forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
        .086, 1.6, 3500 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
    ],
    backwardRates: [ // The backward rates for the reactions
        .034, .00034, 320 // 1.01e-3 and 3.02e2 from Ghosh
    ],
    step_size: .001, // The step size that the approximation will use
    time_length: 170000, // The time length the approximation will run for
    points: 1000,
    output_file: 'output.csv'
}
