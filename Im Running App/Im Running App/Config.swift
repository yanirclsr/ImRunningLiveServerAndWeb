import Foundation

// MARK: - Environment Configuration
enum Environment {
    case development
    case production
    
    static var current: Environment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }
}

struct Config {
    static let environment = Environment.current
    
    // Server URLs
    static var baseURL: String {
        switch environment {
        case .development:
            return "http://192.168.1.108:3000" // Your local development server
        case .production:
            return "https://imrunning.live" // Your production server
        }
    }
    
    static var websocketURL: String {
        switch environment {
        case .development:
            return "ws://192.168.1.108:3000"
        case .production:
            return "wss://imrunning.live"
        }
    }
    
    // API Endpoints
    static var apiBaseURL: String {
        return "\(baseURL)/api"
    }
    
    // Feature Flags
    static var enableDevelopmentMode: Bool {
        return environment == .development
    }
    
    static var enableLocationSimulation: Bool {
        return environment == .development
    }
    
    // Logging
    static var enableVerboseLogging: Bool {
        return environment == .development
    }
    
    // Timeouts
    static var requestTimeout: TimeInterval {
        switch environment {
        case .development:
            return 15.0
        case .production:
            return 30.0
        }
    }
    
    static var resourceTimeout: TimeInterval {
        switch environment {
        case .development:
            return 30.0
        case .production:
            return 60.0
        }
    }
}

// MARK: - Debug Information
extension Config {
    static func printConfiguration() {
        print("🔧 App Configuration:")
        print("   Environment: \(environment)")
        print("   Base URL: \(baseURL)")
        print("   WebSocket URL: \(websocketURL)")
        print("   API Base URL: \(apiBaseURL)")
        print("   Development Mode: \(enableDevelopmentMode)")
        print("   Verbose Logging: \(enableVerboseLogging)")
        print("   Request Timeout: \(requestTimeout)s")
        print("   Resource Timeout: \(resourceTimeout)s")
    }
}
