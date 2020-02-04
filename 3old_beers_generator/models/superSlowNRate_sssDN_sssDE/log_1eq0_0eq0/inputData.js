module.exports = {
    initialConditions: [ // Initial concentrations go here, starting with monomers, and then aggregates in increasing mass order
        1, 0, 0, 0, 0, 0
    ],
    n: 6, // Number of monomers it takes to make the first aggregate
    forwardRates: [ // The forward rates for the reactions, starting the the monomer aggregation
        1, .01, 1
    ],
    backwardRates: [ // The backward rates for the reactions, starting with the smallest aggregate dissociation
        1, .001, .001
    ],
    stepSize: 0.01, // The step size that the approximation will use
    timeLength: 100, // The time length the approximation will run for
}
