module.exports = {
    constants: {
        initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
            .000120, 0, 0, 0
        ],
        step_size: .001, // The step size that the approximation will use
        time_length: 170000, // The time length the approximation will run for
        points: 10000,
    },
    param_arr: [
        {
            n: 4.35, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .0105, 1.5, 3780 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.0101, 0.00272, 283 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 2.97, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .0113, 1.45, 3220 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.0525, 0.00331, 424 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 1.25, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .0246, 1.30, 5570 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.0204, 0.00331, 424 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 5.75, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .00864, 1.63, 2670 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.0133, 0.00276, 300 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 3.06, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .0121, 1.46, 3090 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.0543, 0.00371, 447 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 0.917, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .0364, 1.31, 5160 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.0377, 0.00982, 767 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
        {
            n: 4, // Number of monomers it takes to make the first aggregate
            forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
                .0005, 1.8, 1200 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
            ],
            backwardRates: [ // The backward rates for the reactions
                0.01, 0.001, 200 // 1.01e-3 and 3.02e2 from Ghosh
            ]
        },
    ]
}
