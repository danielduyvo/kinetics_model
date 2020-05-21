#include <iostream>
#include <vector>
#include <thread>
#include <cmath>
#include <fstream>
#include <string>
#include <sstream>
#include <utility>
#include <algorithm>
#include <cstring>
#include <chrono>

static const int RATE_CONSTANTS = 3;
static const unsigned int PROC_COUNT = std::thread::hardware_concurrency();
static const int DEFAULT_POINTS = 1000;

class Params {
    public:
        double n;
        double r;
        std::vector<double> forward;
        std::vector<double> backward;
		Params(double n, double r, std::vector<double> forward, std::vector<double> backward)
			: n(n), r(r), forward(forward), backward(backward) {};
        Params()
            : n(0), r(0), forward(RATE_CONSTANTS, 0), backward(RATE_CONSTANTS, 0) {};
        Params(std::stringstream &line) 
            : forward(RATE_CONSTANTS), backward(RATE_CONSTANTS)
        {
            std::string temp;
            std::getline(line, temp, ',');
            n = std::stod(temp);
            std::getline(line, temp, ',');
            r = std::stod(temp);
            std::getline(line, temp, ',');
            forward[0] = std::stod(temp);
            std::getline(line, temp, ',');
            forward[1] = std::stod(temp);
            std::getline(line, temp, ',');
            forward[2] = std::stod(temp);
            std::getline(line, temp, ',');
            backward[0] = std::stod(temp);
            std::getline(line, temp, ',');
            backward[1] = std::stod(temp);
            std::getline(line, temp, ',');
            backward[2] = std::stod(temp);
        }
        bool is_positive() {
            if (n < 0) return false;
            if (r < 0) return false;
            for (int i = 0; i < RATE_CONSTANTS; i++) {
                if (forward[i] < 0) return false;
                if (backward[i] < 0) return false;
            }
            return true;
        }
        Params operator+(const Params& other) {
            Params ans;
            ans.n = n + other.n;
            ans.r = r + other.r;
            for ( int i = 0; i < RATE_CONSTANTS; i++) {
                ans.forward[i] = forward[i] + other.forward[i];
                ans.backward[i] = backward[i] + other.backward[i];
            }
            return ans;
        }
        Params operator-(const Params& other) {
            Params ans;
            ans.n = n - other.n;
            ans.r = r - other.r;
            for ( int i = 0; i < RATE_CONSTANTS; i++) {
                ans.forward[i] = forward[i] - other.forward[i];
                ans.backward[i] = backward[i] - other.backward[i];
            }
            return ans;
        }
        Params operator*(const double& scalar) {
            Params ans;
            ans.n = n * scalar;
            ans.r = r * scalar;
            for (int i = 0; i < RATE_CONSTANTS; i++) {
                ans.forward[i] = forward[i] * scalar;
                ans.backward[i] = backward[i] * scalar;
            }
            return ans;
        }
        void print() {
            std::cout << "n: " << n << std::endl;
            std::cout << "r: " << r << std::endl;
            std::cout << "forward: " << forward[0] << ',' << forward[1] << ',' << forward[2] << std::endl;
            std::cout << "backward: " << backward[0] << ',' << backward[1] << ',' << backward[2] << std::endl;
        }
};

class Conditions {
    public:
        double im;
        double am;
        std::vector<double> agg;
		Conditions()
			: im(0), am(0), agg() {};
        Conditions(int size)
            : im(0), am(0), agg()
        {
            agg.resize(size);
        };
        Conditions(std::stringstream &line) {
            std::string temp;
            std::getline(line, temp, ',');
            im = std::stod(temp);
            std::getline(line, temp, ',');
            am = std::stod(temp);
            while (std::getline(line, temp, ',')) {
                agg.push_back(std::stod(temp));
            }
        }
        Conditions(double im, double am, std::vector<double>& agg)
            : im(im), am(am), agg(agg) {};
        Conditions(const Conditions &orig)
            : im(orig.im), am(orig.am), agg(orig.agg) {};
        Conditions next(Params& params, double step_size) {
			int agg_size = agg.size();
            Conditions next_con(agg_size + 1);
            double diff = 0; // calculating im
            diff = -(im * params.forward[0]) + (am * params.backward[0]);
            next_con.im = im + step_size * diff;

            diff = 0; // calculating am
            diff += im * params.forward[0];
            diff -= am * params.backward[0];
            diff -= params.n * std::pow(am, params.r) * params.forward[1];
            diff += params.n * agg[0] * params.backward[1];
            for (int i = 0; i < agg_size - 1; i++) {
                diff -= am * agg[i] * params.forward[2];
                diff += agg[i + 1] * params.backward[2];
            }
            diff -= am * agg[agg_size - 1] * params.forward[2];
            next_con.am = am + step_size * diff;

            diff = 0; // calculating first aggregate
            diff += std::pow(am, params.r) * params.forward[1];
            diff -= agg[0] * params.backward[1];
            diff -= am * agg[0] * params.forward[2];
            diff += agg[1] * params.backward[2];
            next_con.agg[0] = agg[0] + step_size * diff;

            for (int i = 1; i < agg_size - 1; i++) {
                diff = 0; // calculating intermediate aggregates
                diff += am * agg[i - 1] * params.forward[1];
                diff -= agg[i] * params.backward[1];
                diff -= am * agg[i] * params.forward[1];
                diff += agg[i + 1] * params.backward[1];
                next_con.agg[i] = agg[i] + step_size * diff;
            }

            diff = 0; // calculating last aggregate
            diff += am * agg[agg_size - 2] * params.forward[1];
            diff -= agg[agg_size - 1] * params.backward[1];
            diff -= am * agg[agg_size - 1] * params.forward[1];
            next_con.agg[agg_size - 1] = agg[agg_size - 1] + step_size * diff;

            diff = 0; // calculating next aggregate
            diff += am * agg[agg_size - 1] * params.forward[1];
            next_con.agg[agg_size] = 0 + step_size * diff;

            return next_con;
        };
        double agg_mass() {
            double mass = 0;
            for (int i = 0; i < agg.size(); i++) {
                mass += agg[i];
            }
            return mass;
        };
        int agg_size() {
            return agg.size();
        };
};

class Concentrations {
    public:
        std::vector<double> times;
        std::vector<Conditions> conditions;
        Concentrations() 
            : times(), conditions() {};
        Concentrations(Conditions& initial, Params& params, double time_length, double step_size)
            : times(), conditions()
        {
            int len = time_length / step_size + 2;
            times.resize(len);
            conditions.resize(len);
            conditions[0] = initial;
            times[0] = 0;
            for (int pos = 1; pos < len; pos++) {
                conditions[pos] = conditions[pos - 1].next(params, step_size);
                times[pos] = times[pos - 1] + step_size;
            }
        };
        Concentrations(const Concentrations &orig)
            : conditions(orig.conditions), times(orig.times) {};
        void print(std::string& file_name) {
            std::ofstream output;
            output.open(file_name, std::ofstream::out | std::ofstream::trunc);
            for (int i = 0; i < times.size(); i++) {
                output << times[i] << ',' << conditions[i].im << ',' << conditions[i].am << ',';
                for (int j = 0; j < conditions[i].agg_size() - 1; j++) {
                    output << conditions[i].agg[j] << ',';
                }
                output << conditions[i].agg[conditions[i].agg_size() - 1] << '\n';
            }
            output.close();
        };
};

class Masses {
    public:
        std::vector<double> times;
        std::vector<double> masses;
        Masses()
            : times(), masses() {};
        Masses(std::vector<double> times, std::vector<double> masses)
            : times(times), masses(masses) {};
        Masses(Conditions initial, Params params, double time_length, double step_size, int points = DEFAULT_POINTS)
            : times(), masses()
        {
            double push_next = time_length / points;
            double display_steps = 100;
            double display_next = 0;
            std::cout << "Generating Mass" << std::endl;
            double time = 0;
            times.reserve(points);
            masses.reserve(points);
            masses.push_back(initial.agg_mass());
            times.push_back(time);
            for (double step = 0; step < time_length; step += step_size) {
                initial = initial.next(params, step_size);
                time += step_size;
                if (step > push_next) {
                    masses.push_back(initial.agg_mass());
                    times.push_back(time);
                    push_next += time_length / points;
                }
                if (step > display_next) {
                    std::cout << "\n" << "[" << std::string((int) display_steps * step / time_length, (char)254u) << std::string(display_steps - (int) (display_steps * step / time_length), ' ') << "]";
                    std::cout.flush();
                    display_next += time_length / display_steps;
                }
            }
        };
        Masses(Concentrations& concentrations)
            : times(concentrations.times), masses()
        {
            masses.resize(concentrations.conditions.size());
            for (int i = 0; i < concentrations.conditions.size(); i++) {
                masses[i] = concentrations.conditions[i].agg_size();
            }
        };
        Masses(const Masses &orig)
            : times(orig.times), masses(orig.masses) {};
        void print(std::string file_name) {
            std::ofstream output;
            output.open(file_name, std::ofstream::out | std::ofstream::trunc);
            for (int i = 0; i < times.size(); i++) {
                output << times[i] << ',' << masses[i] << '\n';
            }
            output.close();
        };
        Masses(std::string& csv) {
            std::stringstream csv_stream(csv);
            std::string line;
            std::stringstream line_stream;
            std::string val;
            while (csv_stream >> line) {
                line_stream.str(line);
                std::getline(line_stream, val, ',');
                times.push_back(std::stod(val));
                std::getline(line_stream, val, ',');
                masses.push_back(std::stod(val));
                line_stream.clear();
            }
        }
        double get(double time) {
            int L = 0;
            int R = times.size() - 1;
            int m;
            while (L <= R) {
                m = (L + R) / 2;
                if (times[m] < time) {
                    L = m + 1;
                } else if (times[m] > time) {
                    R = m - 1;
                } else return masses[m];
            }
            return (masses[R] + masses[L]) / 2;
        }
        void normalize(double time) {
            double mass = get(time);
            for (int i = 0; i < masses.size(); i++) {
                masses[i] = masses[i] / mass;
            }
        }
};

double MSE(std::vector<Masses>& A, std::vector<Masses>& B) {
    int counter = 0;
    double error = 0;
    for (int i = 0; i < A.size(); i++) {
        for (int j = 0; j < A[i].times.size(); j++) {
            error += std::pow(B[i].get(A[i].times[j]) - A[i].masses[j], 2);
            counter++;
        }
    }
    return error / counter;
}

double calc_error(Params& params, std::vector<Conditions>& conditions, std::vector<Masses>& real_data, double step_size) {
    double error;
    if (params.is_positive()) {
        std::vector<Masses> model;
        for (int i = 0; i < conditions.size(); i++) {
            model.push_back(Masses(conditions[i], params, real_data[i].times[real_data[i].times.size() - 1], step_size));
            model[i].normalize(real_data[i].times[real_data[i].times.size() - 1]);
        }
        error = MSE(real_data, model);
    } else {
        error = INFINITY;
    }
    return error;
}

Params globalFit(std::vector<Masses> real_data, std::vector<Params> params_vec, std::vector<Conditions> initials, double step_size) {
    for (int i = 0; i < real_data.size(); i++) {
        real_data[i].normalize(real_data[i].times[real_data[i].times.size() - 1]);
    }
    std::vector<std::pair<Params,double>> guesses;
    guesses.resize(params_vec.size());
    for (int i = 0; i < params_vec.size(); i++) {
        guesses[i] = std::make_pair(params_vec[i], calc_error(
                    params_vec[i], initials, real_data, step_size
                    )
                );
        guesses[i].first.print();
        std::cout << guesses[i].second << std::endl;
    }
    for (int i = 0; i < 100; i++) {
        std::sort(guesses.begin(), guesses.end(),
                [](std::pair<Params, double> a, std::pair<Params, double> b) {
                return a.second < b.second;
                });
        std::cout << "Ordered guesses" << std::endl;
        for (int i = 0; i < guesses.size(); i++) {
            guesses[i].first.print();
            std::cout << guesses[i].second << std::endl;
        }
        // Find the centroid
        Params centroid;
        for (int j = 0; j < guesses.size() - 1; j++) {
            centroid = centroid + guesses[j].first;
        }
        centroid = centroid * (1.0 / (guesses.size() - 1));
        std::cout << "Centroid" << std::endl;
        centroid.print();
        // Reflect point
        Params reflection = centroid + centroid - guesses[guesses.size() - 1].first;
        std::cout << "Reflection" << std::endl;
        reflection.print();
        double refl_error = calc_error(reflection, initials, real_data, step_size);
        std::cout << "Error: " << refl_error << std::endl;
        if (refl_error < guesses[guesses.size() - 1].second && refl_error > guesses[0].second) {
            // Reflection is good
            guesses[guesses.size() - 1].first = reflection;
            guesses[guesses.size() - 1].second = refl_error;
            continue;
        } else if (refl_error <= guesses[0].second) {
            // Reflection is reall good, try expanding
            Params expansion = centroid + ( (reflection - centroid) * 2 );
            std::cout << "Expansion" << std::endl;
            expansion.print();
            double expa_error = calc_error(expansion, initials, real_data, step_size);
            std::cout << "Error: " << expa_error << std::endl;
            if (expa_error < refl_error) {
                guesses[guesses.size() - 1].first = expansion;
                guesses[guesses.size() - 1].second = expa_error;
            } else {
                guesses[guesses.size() - 1].first = reflection;
                guesses[guesses.size() - 1].second = refl_error;
            }
            continue;
        }
        // Reflection is bad, try contraction instead
        Params in_contraction = centroid + ( (guesses[guesses.size() - 1].first - centroid) * 0.5 );
        std::cout << "Contraction (inside)" << std::endl;
        in_contraction.print();
        double in_cont_error = calc_error(in_contraction, initials, real_data, step_size);
        std::cout << "Error: " << in_cont_error << std::endl;
        Params out_contraction = centroid + ( (reflection - centroid) * 0.5 );
        std::cout << "Contraction (outside)" << std::endl;
        out_contraction.print();
        double out_cont_error = calc_error(out_contraction, initials, real_data, step_size);
        std::cout << "Error: " << out_cont_error << std::endl;
        if (in_cont_error < guesses[guesses.size() - 1].second) {
            if (in_cont_error < out_cont_error) {
                guesses[guesses.size() - 1].first = in_contraction;
                guesses[guesses.size() - 1].second = in_cont_error;
            } else {
                guesses[guesses.size() - 1].first = out_contraction;
                guesses[guesses.size() - 1].second = out_cont_error;
            }
            continue;
        } else if (out_cont_error < guesses[guesses.size() - 1].second) {
            guesses[guesses.size() - 1].first = out_contraction;
            guesses[guesses.size() - 1].second = out_cont_error;
            continue;
        }
        // Contractions are bad, shrink instead
        for (int j = 1; j < guesses.size(); j++) {
            guesses[j].first = guesses[j].first + ( (guesses[j].first - guesses[0].first) * 0.5 );
            guesses[j].second = calc_error(guesses[j].first, initials, real_data, step_size);
        }
    }
    std::sort(guesses.begin(), guesses.end(),
            [](std::pair<Params, double> a, std::pair<Params, double> b) {
            return a.second < b.second;
            });
    std::cout << "Final guesses" << std::endl;
    for (int i = 0; i < guesses.size(); i++) {
        guesses[i].first.print();
        std::cout << guesses[i].second << std::endl;
    }
    return guesses[0].first;
}

int main(int argc, char *argv[]) {
    // argv[1] : "gen" or "fit"
    // argv[2] : params file
    // argv[3] : initial conditions
    // argv[4] : real data file / 'mass' vs 'conc'
    // argv[5] : output file
    // argv[6] : step size
    // argv[7] : time length
    std::vector<Params> params;
    std::fstream params_file;
    params_file.open(argv[2], std::ofstream::in);
    std::string line;
    std::stringstream line_stream;
    while (std::getline(params_file, line)) {
        line_stream.str(line);
        params.push_back(Params(line_stream));
        line_stream.clear();
    }
    params_file.close();
    std::vector<Conditions> conditions;
    std::fstream conditions_file;
    conditions_file.open(argv[3], std::ofstream::in);
    while (std::getline(conditions_file, line)) {
        line_stream.str(line);
        conditions.push_back(Conditions(line_stream));
        line_stream.clear();
    }
    conditions_file.close();
    if (std::strcmp(argv[1],"gen") == 0) {
        for (int i = 0; i < params.size(); i++) {
            if (std::strcmp(argv[4], "mass") == 0) {
                Masses masses(conditions[i], params[i], std::atof(argv[7]), std::atof(argv[6]));
                masses.print(std::to_string(i) + std::string(argv[5]));
            } else if (std::strcmp(argv[4], "conc") == 0) {
                Concentrations concentrations(conditions[i], params[i], std::atof(argv[7]), std::atof(argv[6]));
				std::string output_file_name = std::to_string(i) + std::string(argv[5]);
                concentrations.print(output_file_name);
            }
        }
    } else if (std::strcmp(argv[1], "fit") == 0) {
        std::vector<Masses> real_data;
        std::fstream fit_file;
        fit_file.open(argv[4], std::ofstream::in);
        std::string fit_string;
        while (std::getline(fit_file, fit_string, '>')) {
            real_data.push_back(Masses(fit_string));
        }
        Params result = globalFit(real_data, params, conditions, std::atof(argv[6]));
        std::ofstream output;
        output.open(argv[5], std::ofstream::out | std::ofstream::trunc);
        output << "n:" << result.n << std::endl;
        output << "r:" << result.r << std::endl;
        output << "forward:" << result.forward[0] << ',' << result.forward[1] << ',' << result.forward[2] << std::endl;
        output << "backward:" << result.backward[0] << ',' << result.backward[1] << ',' << result.backward[2] << std::endl;
        output.close();
    }
	std::cout << "Algorithm completed, hit ENTER to end" << std::endl;
	std::cin.get();
    return 0;
}
