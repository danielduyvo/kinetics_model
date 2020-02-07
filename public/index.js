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
            return;
        }
    }
});

console.log('vue instance loaded');

