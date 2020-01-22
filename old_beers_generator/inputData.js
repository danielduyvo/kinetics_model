module.exports = {
    initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
        0, 1
    ],
    n: 6, // Number of monomers it takes to make the first aggregate
    forwardRates: [ // The forward rates for the reactions, starting the the monomer aggregation
        0, .01, 1
    ],
    backwardRates: [ // The backward rates for the reactions, starting with the smallest aggregate dissociation
        0, .01, .001
    ],
    stepSize: 1, // The step size that the approximation will use
    timeLength: 10000, // The time length the approximation will run for
}
