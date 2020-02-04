#load file
data = read.table("data.csv", header=FALSE, sep=",")
times <- c(0:(length(data[,1])-1))
# Beer's Law may be written simply as:

# A = εbc

# where A is absorbance (no units)
# ε is the molar absorptivity with units of L mol-1 cm-1 (formerly called the extinction coefficient)
# b is the path length of the sample, usually expressed in cm
# c is the concentration of the compound in solution, expressed in mol L-1

epsilon = 1
b = 2
data <- data * epsilon * b
maximum <- max(data)

png(filename = "graph.png");
plot(times, data[,1], col="red", ylim=c(0, maximum))
points(times, data[,2], col="orange")
points(times, data[,3], col="yellow")
points(times, data[,4], col="green")
dev.off()