normalize = function(data) {
    rows = nrow(data);
    final = data[rows, 'V2'];
    data$V2 = data$V2 / final;
    return(data);
}

points = read.csv("output.csv", header=FALSE)
x_s = points$V1
png("iM.png")
plot(x_s, points$V2, xlab = "time (seconds)", ylab="iM concentration")
dev.off()
png("aM.png")
plot(x_s, points$V3, xlab = "time (seconds)", ylab="aM concentration")
dev.off()
png("A1.png")
plot(x_s, points$V4, xlab = "time (seconds)", ylab="A1 concentration")
dev.off()
png("monomers.png")
plot(x_s, points$V7, xlab = "steps", ylab="A5 concentration", col="red")
points(x_s, points$V3, xlab= "time (seconds)", col="green")
dev.off()
