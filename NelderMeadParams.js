module.exports = {
    constants: {
        initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
            .1, 0, 0, 0
        ],
        step_size: .001, // The step size that the approximation will use
        time_length: 100, // The time length the approximation will run for
        points: 100,
    },
    param_arr: [
        {
            n: 10, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .001, 1.2, 1000 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0, 0.05, 800 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 2, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .0001, 1.3, 5000 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.00001, 0.005, 500 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 2, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .00001, 1.4, 10000 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.000000000001, 0.002, 700 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 3, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .0000001, 1.5, 1500 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.1, 0.001, 400 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 6, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .005, 1.6, 1400 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.0001, 0.0001, 100 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 2, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .5, 1.7, 1300 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.00001, 0.01, 300 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 4, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .5, 1.8, 1200 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.01, 0.001, 200 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
    ]
}
