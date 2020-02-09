let app = new Vue({
    el: '#app',
    data: {
        iM: '',
        aM: '',
        A1: '',
        A2: '',
        n: '',
        nm: '',
        f1: '',
        f2: '',
        f3: '',
        b1: '',
        b2: '',
        b3: '',
        output_file: '',
        step_size: '',
        time_length: '',
        points: ''
    },
    methods: {
        requestModel: async function () {
            let { iM, aM, A1, A2, n, nm, f1, f2, f3, b1, b2, b3, output_file, points, step_size, time_length } = this;
            iM = parseFloat(iM);
            aM = parseFloat(aM);
            A1 = parseFloat(A1);
            A2 = parseFloat(A2);
            n = parseInt(n);
            nm = parseFloat(nm);
            f1 = parseFloat(f1);
            f2 = parseFloat(f2);
            f3 = parseFloat(f3);
            b1 = parseFloat(b1);
            b2 = parseFloat(b2);
            b3 = parseFloat(b3);
            points = parseInt(points);
            step_size = parseFloat(step_size);
            time_length = parseFloat(time_length);
            nm = parseFloat(nm);
            let body = {
                initialConditions: [iM, aM, A1, A2],
                n: n,
                forwardRates: [f1, f2, f3],
                backwardRates: [b1, b2, b3],
                metaparameters: {
                    output_file: output_file,
                    points: points,
                    step_size: step_size,
                    time_length: time_length
                },
                nm: nm
            };
            console.log(JSON.stringify(body));
            let response = await fetch('/model', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            let blob = await response.blob();
            let url = window.URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = output_file;
            document.body.appendChild(a);
            a.click();
            a.remove();
            return this.generateGraph(blob, body);
        },
        generateGraph: async function (blob, body) {
            // set the dimensions and margins of the graph
            var margin = {top: 10, right: 30, bottom: 30, left: 60},
            width = 460 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

            // append the svg object to the body of the page
            var svg = d3.select("#graph")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            
            let text = await (new Response(blob)).text();
            let parsedObject = Papa.parse(text);
            let parsedData = parsedObject.data;
            let d3Data = [];
            let ymax = 0;
            for (let i = 0, end = parsedData.length; i < end; i++) {
                let aggregateMax = 0;
                for (let j = 3, last = parsedData[i].length; j < last; j++) {
                    aggregateMax += parsedData[i][j] * body.n * (j - 2);
                }
                if (ymax < aggregateMax) ymax = aggregateMax;
                let data = [ parseFloat(parsedData[i][0]), aggregateMax ];
                d3Data.push(data);
            }

            let x = d3.scaleLinear()
            .domain([0, body.metaparameters.time_length])
            .range([0, width]);
            svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

            let y = d3.scaleLinear()
            .domain([0, ymax * 1.1])
            .range([height, 0]);
            svg.append("g")
            .call(d3.axisLeft(y));

            svg.append('g')
            .selectAll("dot")
            .data(d3Data)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return x(d[0]); })
            .attr("cy", function (d) { return y(d[1]); })
            .attr("r", 1.5)
            .style("fill", "#69b3a2");
        }
    }
});

console.log('vue instance loaded');

