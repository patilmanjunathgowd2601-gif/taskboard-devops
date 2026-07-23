const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "backend_" });

const httpRequestsTotal = new client.Counter({
  name: "backend_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});
register.registerMetric(httpRequestsTotal);

function metricsMiddleware(req, res, next) {
  res.on("finish", () => {
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
  });
  next();
}

module.exports = { register, metricsMiddleware };
