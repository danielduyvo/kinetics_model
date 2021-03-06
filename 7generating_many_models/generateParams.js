module.exports = {
    initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
        .1, 0, 0, 0
    ],
    start: {
        n: 1, // Number of monomers it takes to make the first aggregate
        forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
            .001, 1.2, 1000 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
        ],
        backwardRates: [ // The backward rates for the reactions
            0, 0, 200 // 1.01e-3 and 3.02e2 from Ghosh
        ]
    },
    change: {
        n: 1,
        forwardRates: [
            .001, .01, 100
        ],
        backwardRates: [
            .0001, .0001, 10
        ]
    },
    number: {
        n: 10,
        forwardRates: [
            100, 100, 100
        ],
        backwardRates: [
            100, 100, 100
        ]
    },
    step_size: .001, // The step size that the approximation will use
    time_length: 36000, // The time length the approximation will run for
    points: 100,
    output_folder: '/test/'
}
