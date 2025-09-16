import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as THREE from 'three';
import { CameraController } from '../../src/components/CameraController.js';

// Mock Three.js objects
const mockCamera = {
  position: new THREE.Vector3(0, 5, 10),
  lookAt: jest.fn(),
  updateProjectionMatrix: jest.fn()
};

const mockTarget = {
  position: new THREE.Vector3(0, 0, 0)
};

const mockCollisionObject = {
  geometry: new THREE.BoxGeometry(1, 1, 1),
  material: new THREE.MeshBasicMaterial(),
  position: new THREE.Vector3(0, 0, 5)
};

describe('CameraController', () => {
  let cameraController;

  beforeEach(() => {
    cameraController = new CameraController();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (cameraController) {
      cameraController.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(cameraController.camera).toBeNull();
      expect(cameraController.target).toBeNull();
      expect(cameraController.isInitialized).toBe(false);
      expect(cameraController.followSpeed).toBe(5.0);
      expect(cameraController.lookAtSpeed).toBe(8.0);
      expect(cameraController.minDistance).toBe(3.0);
      expect(cameraController.maxDistance).toBe(15.0);
    });

    test('should initialize with camera and target', () => {
      cameraController.initialize(mockCamera, mockTarget);
      
      expect(cameraController.camera).toBe(mockCamera);
      expect(cameraController.target).toBe(mockTarget);
      expect(cameraController.isInitialized).toBe(true);
    });

    test('should not initialize without camera or target', () => {
      cameraController.initialize(null, mockTarget);
      expect(cameraController.isInitialized).toBe(false);
      
      cameraController.initialize(mockCamera, null);
      expect(cameraController.isInitialized).toBe(false);
    });
  });

  describe('Target Management', () => {
    beforeEach(() => {
      cameraController.initialize(mockCamera, mockTarget);
    });

    test('should set target', () => {
      const newTarget = { position: new THREE.Vector3(5, 0, 5) };
      cameraController.setTarget(newTarget);
      
      expect(cameraController.target).toBe(newTarget);
    });

    test('should get target position from object with position property', () => {
      const targetPos = cameraController.getTargetPosition();
      expect(targetPos).toEqual(mockTarget.position);
    });

    test('should get target position from Vector3 target', () => {
      const vectorTarget = new THREE.Vector3(1, 2, 3);
      cameraController.setTarget(vectorTarget);
      
      const targetPos = cameraController.getTargetPosition();
      expect(targetPos).toEqual(vectorTarget);
    });

    test('should handle invalid target gracefully', () => {
      cameraController.setTarget({});
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const targetPos = cameraController.getTargetPosition();
      expect(targetPos).toEqual(new THREE.Vector3(0, 0, 0));
      expect(consoleSpy).toHaveBeenCalledWith('Target does not have a valid position');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Camera Positioning', () => {
    beforeEach(() => {
      cameraController.initialize(mockCamera, mockTarget);
    });

    test('should set camera offset', () => {
      cameraController.setOffset(1, 2, 3);
      expect(cameraController.offset).toEqual(new THREE.Vector3(1, 2, 3));
    });

    test('should set look-at offset', () => {
      cameraController.setLookAtOffset(0.5, 1.5, 0);
      expect(cameraController.lookAtOffset).toEqual(new THREE.Vector3(0.5, 1.5, 0));
    });

    test('should update camera position immediately when forced', () => {
      const originalPosition = mockCamera.position.clone();
      mockTarget.position.set(10, 0, 10);
      
      cameraController.updateCameraPosition(0, true);
      
      // Camera should move to target + offset immediately
      const expectedPosition = new THREE.Vector3(10, 5, 20); // target + default offset
      expect(mockCamera.position).toEqual(expectedPosition);
      expect(mockCamera.lookAt).toHaveBeenCalled();
    });

    test('should smoothly interpolate camera position over time', () => {
      const initialPosition = mockCamera.position.clone();
      mockTarget.position.set(5, 0, 5);
      
      // First update - should move partway
      cameraController.updateCameraPosition(0.1);
      const firstUpdatePosition = mockCamera.position.clone();
      
      // Should not be at initial position
      expect(firstUpdatePosition).not.toEqual(initialPosition);
      
      // Should not be at final position yet
      const expectedFinalPosition = new THREE.Vector3(5, 5, 15);
      expect(firstUpdatePosition).not.toEqual(expectedFinalPosition);
      
      // Multiple updates should get closer to target
      for (let i = 0; i < 10; i++) {
        cameraController.updateCameraPosition(0.1);
      }
      
      const finalPosition = mockCamera.position.clone();
      expect(finalPosition.distanceTo(expectedFinalPosition)).toBeLessThan(0.5);
    });

    test('should respect height constraints', () => {
      cameraController.setHeightConstraints(2, 8);
      
      // Test minimum height constraint
      mockTarget.position.set(0, 0, 0);
      cameraController.setOffset(0, -5, 10); // Would put camera below min height
      cameraController.updateCameraPosition(0, true);
      
      expect(mockCamera.position.y).toBeGreaterThanOrEqual(2);
      
      // Test maximum height constraint
      cameraController.setOffset(0, 15, 10); // Would put camera above max height
      cameraController.updateCameraPosition(0, true);
      
      expect(mockCamera.position.y).toBeLessThanOrEqual(8);
    });
  });

  describe('Collision Avoidance', () => {
    beforeEach(() => {
      cameraController.initialize(mockCamera, mockTarget);
    });

    test('should add and remove collision layers', () => {
      expect(cameraController.collisionLayers).toHaveLength(0);
      
      cameraController.addCollisionLayer(mockCollisionObject);
      expect(cameraController.collisionLayers).toHaveLength(1);
      expect(cameraController.collisionLayers[0]).toBe(mockCollisionObject);
      
      cameraController.removeCollisionLayer(mockCollisionObject);
      expect(cameraController.collisionLayers).toHaveLength(0);
    });

    test('should add multiple collision objects as array', () => {
      const objects = [mockCollisionObject, { name: 'object2' }];
      cameraController.addCollisionLayer(objects);
      
      expect(cameraController.collisionLayers).toHaveLength(2);
    });

    test('should remove multiple collision objects as array', () => {
      const objects = [mockCollisionObject, { name: 'object2' }];
      cameraController.addCollisionLayer(objects);
      cameraController.removeCollisionLayer(objects);
      
      expect(cameraController.collisionLayers).toHaveLength(0);
    });

    test('should return desired position when no collision layers', () => {
      const targetPos = new THREE.Vector3(0, 0, 0);
      const desiredPos = new THREE.Vector3(0, 5, 10);
      
      const result = cameraController.applyCollisionAvoidance(targetPos, desiredPos);
      expect(result).toEqual(desiredPos);
    });
  });

  describe('Distance Management', () => {
    beforeEach(() => {
      cameraController.initialize(mockCamera, mockTarget);
    });

    test('should set distance constraints', () => {
      cameraController.setDistanceConstraints(2, 20);
      
      expect(cameraController.minDistance).toBe(2);
      expect(cameraController.maxDistance).toBe(20);
    });

    test('should enforce minimum distance constraint', () => {
      cameraController.setDistanceConstraints(5, 20);
      
      // minDistance should not be less than 0.1
      cameraController.setDistanceConstraints(-1, 20);
      expect(cameraController.minDistance).toBe(0.1);
    });

    test('should enforce maxDistance >= minDistance', () => {
      cameraController.setDistanceConstraints(10, 5);
      
      expect(cameraController.minDistance).toBe(10);
      expect(cameraController.maxDistance).toBe(10); // Should be adjusted to minDistance
    });

    test('should calculate distance from target', () => {
      mockCamera.position.set(0, 5, 10);
      mockTarget.position.set(0, 0, 0);
      
      const distance = cameraController.getDistanceFromTarget();
      const expectedDistance = Math.sqrt(5*5 + 10*10); // sqrt(25 + 100) = sqrt(125)
      
      expect(distance).toBeCloseTo(expectedDistance, 2);
    });

    test('should return 0 distance when camera or target is null', () => {
      cameraController.camera = null;
      expect(cameraController.getDistanceFromTarget()).toBe(0);
      
      cameraController.camera = mockCamera;
      cameraController.target = null;
      expect(cameraController.getDistanceFromTarget()).toBe(0);
    });
  });

  describe('Speed Configuration', () => {
    test('should set follow speed with minimum constraint', () => {
      cameraController.setFollowSpeed(10);
      expect(cameraController.followSpeed).toBe(10);
      
      cameraController.setFollowSpeed(0.05); // Below minimum
      expect(cameraController.followSpeed).toBe(0.1);
    });

    test('should set look-at speed with minimum constraint', () => {
      cameraController.setLookAtSpeed(15);
      expect(cameraController.lookAtSpeed).toBe(15);
      
      cameraController.setLookAtSpeed(0.05); // Below minimum
      expect(cameraController.lookAtSpeed).toBe(0.1);
    });
  });

  describe('Update Method', () => {
    test('should not update when not initialized', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      cameraController.update(0.016, {});
      
      // Should not throw error and should handle gracefully
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should update camera position when initialized', () => {
      cameraController.initialize(mockCamera, mockTarget);
      const updateSpy = jest.spyOn(cameraController, 'updateCameraPosition');
      
      cameraController.update(0.016, {});
      
      expect(updateSpy).toHaveBeenCalledWith(0.016);
      updateSpy.mockRestore();
    });
  });

  describe('Reset and Cleanup', () => {
    beforeEach(() => {
      cameraController.initialize(mockCamera, mockTarget);
    });

    test('should reset camera position', () => {
      const resetSpy = jest.spyOn(cameraController, 'updateCameraPosition');
      
      cameraController.resetPosition();
      
      expect(resetSpy).toHaveBeenCalledWith(0, true);
      resetSpy.mockRestore();
    });

    test('should destroy and cleanup resources', () => {
      cameraController.addCollisionLayer(mockCollisionObject);
      
      cameraController.destroy();
      
      expect(cameraController.camera).toBeNull();
      expect(cameraController.target).toBeNull();
      expect(cameraController.collisionLayers).toHaveLength(0);
      expect(cameraController.raycaster).toBeNull();
      expect(cameraController.isInitialized).toBe(false);
    });
  });

  describe('Component Interface', () => {
    test('should implement render method', () => {
      expect(typeof cameraController.render).toBe('function');
      
      // Should not throw when called
      expect(() => {
        cameraController.render(null, null, null);
      }).not.toThrow();
    });
  });
});