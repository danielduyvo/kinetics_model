module.exports = {
    initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
        1, 0, 0
    ],
    n: 1, // Number of monomers it takes to make the first aggregate
    forwardRates: [ // The forward rates for the reactions, starting the the monomer aggregation
        0.1, 0.01
    ],
    backwardRates: [ // The backward rates for the reactions, starting with the smallest aggregate dissociation
        0.01, 0.001
    ],
    stepSize: 0.1, // The step size that the approximation will use
    timeLength: 100 // The time length the approximation will run for
}