module.exports = {
    constants: [
        {
            initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
                .000010, 0, 0, 0 // 10 uM
            ],
            step_size: .001, // The step size that the approximation will use
            time_length: 166000, // The time length the approximation will run for
            points: 5000,
        },
        {
            initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
                .000020, 0, 0, 0
            ],
            step_size: .001, // The step size that the approximation will use
            time_length: 166000, // The time length the approximation will run for
            points: 5000,
        },
        {
            initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
                .000030, 0, 0, 0
            ],
            step_size: .001, // The step size that the approximation will use
            time_length: 166000, // The time length the approximation will run for
            points: 5000,
        },
        {
            initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
                .000040, 0, 0, 0
            ],
            step_size: .001, // The step size that the approximation will use
            time_length: 166000, // The time length the approximation will run for
            points: 5000,
        },
    ],
    param_arr: [
        {
            n: 4, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .015, 1.5, 3620 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.026, 0.0039, 400 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 2, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .034, 1.1, 6300 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.053, 0.0075, 680 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 1, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .036, 1.3, 5200 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.038, 0.0098, 770 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 1, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .025, 1.3, 5600 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.02, 0.0033, 420 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 3, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .011, 1.5, 3200 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.053, 0.0033, 420 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 3, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .012, 1.5, 3100 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.054, 0.0037, 450 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 5, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                1, 1.4, 1200 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.01, 0.001, 300 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
    ]
}
