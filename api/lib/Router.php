<?php

class Router {
    private $routes = [];

    public function addRoute($method, $path, $controllerAction) {
        // Convert path with params (like /users/:id) to regex
        $regexPath = preg_replace('/\:([a-zA-Z0-9_]+)/', '(?P<\1>[a-zA-Z0-9_-]+)', $path);
        $regexPath = '#^' . $regexPath . '$#';
        
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $regexPath,
            'action' => $controllerAction
        ];
    }

    public function get($path, $action) { $this->addRoute('GET', $path, $action); }
    public function post($path, $action) { $this->addRoute('POST', $path, $action); }
    public function put($path, $action) { $this->addRoute('PUT', $path, $action); }
    public function delete($path, $action) { $this->addRoute('DELETE', $path, $action); }

    public function dispatch($requestMethod, $requestUri) {
        // Check query parameter ?path= first if provided
        if (!empty($_GET['path'])) {
            $uri = $_GET['path'];
        } elseif (!empty($_SERVER['PATH_INFO'])) {
            $uri = $_SERVER['PATH_INFO'];
        } else {
            $uri = parse_url($requestUri, PHP_URL_PATH);
            // Strip base directory prefix
            $baseDir = '/lms/api';
            if (strpos($uri, $baseDir . '/index.php') === 0) {
                $uri = substr($uri, strlen($baseDir . '/index.php'));
            } elseif (strpos($uri, $baseDir) === 0) {
                $uri = substr($uri, strlen($baseDir));
            }
        }
        if ($uri === '' || $uri === null) $uri = '/';

        foreach ($this->routes as $route) {
            if ($route['method'] === $requestMethod && preg_match($route['path'], $uri, $matches)) {
                
                // Extract named params
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                
                list($controllerClass, $methodName) = explode('@', $route['action']);
                
                require_once __DIR__ . '/../controllers/' . $controllerClass . '.php';
                $controller = new $controllerClass();
                
                if (method_exists($controller, $methodName)) {
                    // Call the method with params
                    return call_user_func_array([$controller, $methodName], [$params]);
                } else {
                    http_response_code(500);
                    echo json_encode(["error" => "Method not found in controller"]);
                    return;
                }
            }
        }

        http_response_code(404);
        echo json_encode(["error" => "Route not found", "uri" => $uri]);
    }
}
