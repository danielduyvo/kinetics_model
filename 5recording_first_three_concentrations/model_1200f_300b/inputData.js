module.exports = {
    initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
        .1, 0, 0, 0
    ],
    n: 6, // Number of monomers it takes to make the first aggregate
    forwardRates: [ // The forward rates for the reactions, starting the the monomer activation
        1200, 1.38, 1200 // kn = 1.38 from Ghosh, ke = 1.2e3 from Rodriguez, 9.3e5 from Young, 1.37e4 from Ghosh
    ],
    backwardRates: [ // The backward rates for the reactions
        302, .00101, 302 // 1.01e-3 and 3.02e2 from Ghosh
    ],
    stepSize: .001, // The step size that the approximation will use
    timeLength: 10000, // The time length the approximation will run for
    points: 100
}
