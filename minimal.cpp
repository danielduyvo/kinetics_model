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
                    std::cout << '\r' << "[" << std::string((int) display_steps * step / time_length, (char)254u) << std::string(display_steps - (int) (display_steps * step / time_length), ' ') << "]";
                    std::cout.flush();
                    display_next += time_length / display_steps;
                }
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

int main() {
    std::vector<double> agg(2, 0);
    Conditions initial(1, 0, agg);
    std::vector<double> forward;
    std::vector<double> backward;
    forward.push_back(.01);
    forward.push_back(1.5);
    forward.push_back(3000);
    backward.push_back(.05);
    backward.push_back(1);
    backward.push_back(1000);
    Params params(4, 2, forward, backward);
    Masses(initial, params, 200000, 0.001);
}
