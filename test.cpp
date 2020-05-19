#include <iostream>
#include <vector>
#include <thread>
#include <cmath>
#include <fstream>
#include <string>

static const int RATE_CONSTANTS = 3;
static const unsigned int PROC_COUNT = std::thread::hardware_concurrency();

class Params {
    public:
        double n;
        double r;
        double forward[RATE_CONSTANTS];
        double backward[RATE_CONSTANTS];
        Params(double n, double r, double forward[], double backward[])
            : n(n), r(r)
        {
            for (int i = 0; i < RATE_CONSTANTS; i++) {
                forward[i] = forward[i];
                backward[i] = backward[i];
            }
        }
};

class Conditions {
    public:
        double im;
        double am;
        std::vector<double> agg;
        Conditions(int size)
            : im(0), am(0), agg() {
                agg.reserve(agg.size() + 1);
            };
        Conditions(double im, double am, std::vector<double> agg)
            : im(im), am(am), agg(agg) {};
        Conditions(const Conditions &orig)
            : im(orig.im), am(orig.am), agg(orig.agg) {};
        Conditions next(Params params, double step_size) {
            Conditions next_con(agg.size() + 1);
            double diff = 0; // calculating im
            diff = -(im * params.forward[0]) + (am * params.backward[0]);
            next_con.im = im + step_size * diff;

            diff = 0; // calculating am
            diff += im * params.forward[0];
            diff -= am * params.backward[0];
            diff -= params.n * std::pow(am, params.r) * params.forward[1];
            diff += params.n * agg[0] * params.backward[1];
            for (int i = 0; i < agg.size() - 1; i++) {
                diff -= am * agg[i] * params.forward[2];
                diff += agg[i + 1] * params.backward[2];
            }
            diff -= am * agg[agg.size() - 1] * params.forward[2];
            next_con.am = am + step_size * diff;

            diff = 0; // calculating first aggregate
            diff += std::pow(am, params.r) * params.forward[1];
            diff -= agg[0] * params.backward[1];
            diff -= am * agg[0] * params.forward[2];
            diff += agg[1] * params.backward[2];
            next_con.agg[0] = agg[0] + step_size * diff;

            for (int i = 1; i < agg.size() - 1; i++) {
                diff = 0; // calculating intermediate aggregates
                diff += am * agg[i - 1] * params.forward[1];
                diff -= agg[i] * params.backward[1];
                diff -= am * agg[i] * params.forward[1];
                diff += agg[i + 1] * params.backward[1];
                next_con.agg[i] = agg[i] + step_size * diff;
            }

            diff = 0; // calculating last aggregate
            diff += am * agg[agg.size() - 2] * params.forward[1];
            diff -= agg[agg.size() - 1] * params.backward[1];
            diff -= am * agg[agg.size() - 1] * params.forward[1];
            next_con.agg[agg.size() - 1] = agg[agg.size() - 1] + step_size * diff;

            diff = 0; // calculating next aggregate
            diff += am * agg[agg.size() - 1] * params.forward[1];
            next_con.agg[agg.size()] = 0 + step_size * diff;

            return next_con;
        };
        int agg_size() {
            return agg.size();
        }
};

class Concentrations {
    public:
        std::vector<double> times;
        std::vector<Conditions> conditions;
        Concentrations() {};
        Concentrations(Conditions initial, Params params, double time_length, double step_size)
            : times(), conditions()
        {
            std::cout << "here" << std::endl;
            int len = time_length / step_size + 2;
            std::cout << len << std::endl;
            times.reserve(len);
            conditions.reserve(len);
            conditions[0] = initial;
            times[0] = 0;
            for (int pos = 1; pos < len; pos++) {
                conditions[pos] = conditions[pos - 1].next(params, step_size);
                times[pos] = times[pos - 1] + step_size;
            }
        };
        Concentrations(const Concentrations &orig)
            : conditions(orig.conditions), times(orig.times) {};
        void print(std::string file_name) {
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
};

int main() {
    double a[3] = {1, 2, 3};
    Params p(1.0, 1.0, a, a);
    std::vector<double> aggregates(10, 0);
    Conditions conditions(1, 0, aggregates);
    Conditions next = conditions.next(p, 1);
    std::cout << "here" << std::endl;
    Concentrations concentrations(conditions, p, 2, 1);
    return 0;
}
