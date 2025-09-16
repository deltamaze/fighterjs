# Design Document

## Overview

The fast-paced 3D fighter is a browser-based JavaScript game built using Three.js for 3D rendering and physics. The game implements a damage accumulation combat system where players attempt to knock opponents off the map through strategic attacks and movement. The architecture emphasizes modularity, performance, and extensibility for future multiplayer implementation.

## Architecture

### Core Systems
- **Rendering Engine**: Three.js for 3D graphics, lighting, and camera management
- **Physics Engine**: Custom lightweight physics for movement and collision detection
- **Input System**: Event-driven input handling with support for complex input combinations
- **Game State Manager**: Centralized state management for game flow and player data
- **Audio System**: Web Audio API for sound effects and music
- **AI System**: Behavior tree-based AI for single-player opponents
- **Component System**: Polymorphic components with standardized update/render interfaces
- **Dependency Injection**: IoC container for service management and testing
- **Time Management**: Frame-independent timing system for consistent gameplay speed

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), Three.js, Web Audio API
- **Build System**: Vite for development and bundling
- **Testing**: Jest for unit testing with dependency injection support
- **Physics**: Custom physics engine optimized for fighting game mechanics
- **Asset Loading**: Three.js loaders for 3D models and textures
- **Architecture**: Dependency injection container for testability and modularity

## File Structure

```
src/
├── components/           # Renderable game objects
│   ├── Player.js
│   ├── Arena.js
│   └── Projectile.js
├── services/            # Business logic and utilities
│   ├── InputService.js
│   ├── PhysicsService.js
│   ├── AudioService.js
│   └── AIService.js
├── systems/             # Core game systems
│   ├── RenderSystem.js
│   ├── PhysicsSystem.js
│   ├── CombatSystem.js
│   └── MovementSystem.js
├── core/               # Framework and base classes
│   ├── Component.js
│   ├── System.js
│   ├── GameLoop.js
│   ├── TimeManager.js
│   └── DIContainer.js
├── utils/              # Helper functions
│   ├── Vector3Utils.js
│   ├── MathUtils.js
│   └── Constants.js
└── tests/              # Jest test files
    ├── components/
    ├── services/
    └── systems/
```

## Component Architecture

### Base Component Interface
```javascript
class Component {
  constructor(dependencies = {})
  update(deltaTime, gameState)
  render(renderer, camera)
  destroy()
}
```

All game objects inherit from Component and implement standardized methods that the main game loop calls.

### Base System Interface
```javascript
class System {
  constructor(dependencies = {})
  update(deltaTime, components, gameState)
  initialize()
  shutdown()
}
```

Systems manage collections of components and handle cross-component logic.

### Time Management
```javascript
class TimeManager {
  constructor()
  update()
  getDeltaTime()        // Frame-independent time delta
  getGameTime()         // Total elapsed game time
  getFixedDeltaTime()   // Fixed timestep for physics
  setTimeScale(scale)   // Slow motion / speed up effects
}
```

Ensures consistent gameplay speed regardless of frame rate variations.

## Components and Interfaces

### Player Character Component
```javascript
class Player extends Component {
  constructor(dependencies = { inputService, physicsService, audioService })
  update(deltaTime, gameState)
  render(renderer, camera)
  handleInput(inputState)
  takeDamage(amount, knockbackVector)
  performAttack(attackType)
  performMovement(movementType)
}
```

**Responsibilities:**
- Character state management (position, velocity, damage percentage)
- Input processing delegation to InputService
- Attack and defense mechanics
- Animation state management
- Dependency injection for testability

### Physics System
```javascript
class PhysicsSystem extends System {
  constructor(dependencies = { timeManager })
  update(deltaTime, components, gameState)
  addRigidBody(body)
  removeRigidBody(body)
  checkCollisions()
  applyKnockback(target, force, direction)
}
```

**Responsibilities:**
- Collision detection between players and environment
- Knockback calculation based on damage percentage
- Fixed timestep physics updates for consistency
- Gravity and movement physics
- Boundary checking for map edges

### Input Service
```javascript
class InputService {
  constructor()
  update()
  getInputState(playerId)
  registerKeyBinding(key, action)
  isActionPressed(action)
  isActionJustPressed(action)
  getInputBuffer(playerId)  // For frame-perfect techniques
}
```

**Responsibilities:**
- Raw input capture and processing
- Input buffering for advanced techniques
- Key binding management
- Multi-player input separation

### Combat System
```javascript
class CombatManager {
  registerAttack(attacker, attackData)
  processHit(attacker, target, attackData)
  calculateKnockback(baseDamage, targetDamage, attackVector)
  checkKnockout(player)
}
```

**Responsibilities:**
- Attack registration and hit detection
- Damage calculation and application
- Knockback force computation
- Victory condition checking

### Movement System
```javascript
class MovementController {
  handleJump(player)
  handleDoubleJump(player)
  handleDash(player, direction)
  handleDodge(player, direction)
  updateMovementState(player, deltaTime)
}
```

**Responsibilities:**
- Advanced movement technique implementation
- Air control and momentum management
- Movement state transitions
- Frame data for movement abilities

### AI System
```javascript
class AIController {
  constructor(difficulty)
  update(player, opponent, gameState)
  selectAction(gameState)
  executeAction(action)
}
```

**Responsibilities:**
- Opponent behavior simulation
- Decision making based on game state
- Difficulty scaling
- Movement and combat AI

## Data Models

### Player State
```javascript
{
  id: string,
  position: Vector3,
  velocity: Vector3,
  rotation: Quaternion,
  damagePercentage: number,
  isGrounded: boolean,
  hasDoubleJump: boolean,
  currentAction: string,
  actionFrames: number,
  invulnerabilityFrames: number,
  stats: {
    speed: number,
    jumpHeight: number,
    dashDistance: number,
    attackPower: number
  }
}
```

### Attack Data
```javascript
{
  type: string,
  damage: number,
  knockbackBase: number,
  knockbackGrowth: number,
  startupFrames: number,
  activeFrames: number,
  recoveryFrames: number,
  hitbox: BoundingBox,
  effects: Array
}
```

### Game State
```javascript
{
  players: Array<Player>,
  gameMode: string,
  timeRemaining: number,
  roundNumber: number,
  scores: Object,
  isPaused: boolean,
  winner: string | null
}
```

## Error Handling

### Input Validation
- Sanitize all user inputs to prevent invalid game states
- Implement input buffering for frame-perfect techniques
- Handle controller disconnection gracefully

### Physics Edge Cases
- Prevent players from clipping through map geometry
- Handle extreme velocity values that could break physics
- Implement recovery mechanisms for stuck players

### Performance Monitoring
- Frame rate monitoring with automatic quality adjustment
- Memory usage tracking to prevent leaks
- Graceful degradation for lower-end devices

### Network Preparation
- Design all systems to be deterministic for future multiplayer
- Implement state serialization for network synchronization
- Error recovery for desynchronized game states

## Testing Strategy

### Unit Testing with Jest
- **Physics System**: Mock TimeManager, test collision detection, knockback calculations, boundary checking
- **Combat System**: Mock dependencies, verify damage application, hit detection, frame data accuracy
- **Movement System**: Test jump mechanics, dash distances, dodge invincibility with mocked services
- **AI System**: Mock game state, test decision making, difficulty scaling, behavior consistency
- **Services**: Test InputService, PhysicsService, AudioService in isolation with dependency injection
- **Components**: Test Player, Arena components with mocked service dependencies

### Integration Testing
- **Player vs AI**: Complete gameplay scenarios with various difficulty levels
- **Input Combinations**: Complex movement techniques and attack combinations
- **Game Flow**: Round transitions, victory conditions, state management
- **Performance**: Frame rate stability under various game conditions

### Visual Testing
- **Rendering**: Verify 3D model display, animations, particle effects
- **Camera System**: Test camera following, collision avoidance, smooth transitions
- **UI Elements**: Damage indicators, round timers, victory screens
- **Art Style Consistency**: Ensure blocky aesthetic across all visual elements

### Gameplay Testing
- **Balance Testing**: Damage values, knockback scaling, movement speeds
- **Accessibility**: Control responsiveness, visual clarity, audio cues
- **Edge Cases**: Map boundary behavior, simultaneous attacks, recovery scenarios
- **Performance**: Consistent 60fps gameplay, memory usage optimization

## Implementation Phases

### Phase 1: Core Foundation
- Dependency injection container setup
- Base Component and System classes
- TimeManager for frame-independent timing
- Basic 3D scene setup with Three.js
- InputService implementation
- Jest testing framework configuration

### Phase 2: Physics and Combat
- Physics engine implementation
- Basic attack system with hit detection
- Damage and knockback mechanics
- Map boundaries and knockout detection

### Phase 3: Advanced Movement
- Double jump implementation
- Dash and dodge mechanics
- Advanced movement combinations
- Movement state management

### Phase 4: AI and Polish
- AI opponent implementation
- Visual effects and animations
- Audio system integration
- UI and game flow completion

### Phase 5: Optimization and Testing
- Performance optimization
- Comprehensive testing
- Bug fixes and balancing
- Documentation and code cleanup