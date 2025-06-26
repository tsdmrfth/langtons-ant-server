import { Rule } from "@/types/game"

export interface ValidationError extends Error {
    field?: string
    value?: any
}

export const createValidationError = (message: string, field?: string, value?: any): ValidationError => {
    const error = new Error(message) as ValidationError
    error.field = field
    error.value = value
    return error
}

export const validatePosition = (position: { x: number; y: number }, maxX: number, maxY: number): void => {
    if (typeof position.x !== 'number' || typeof position.y !== 'number') {
        throw createValidationError('Position coordinates must be numbers', 'position', position)
    }

    if (position.x < 0 || position.x >= maxX || position.y < 0 || position.y >= maxY) {
        throw createValidationError(`Position out of bounds: (${position.x}, ${position.y})`, 'position', position)
    }
}

export const validateColor = (color: string): void => {
    if (typeof color !== 'string') {
        throw createValidationError('Color must be a string', 'color', color)
    }

    if (!/^#[0-9A-F]{6}$/i.test(color)) {
        throw createValidationError('Color must be a valid hex color', 'color', color)
    }
}

export const validateRules = (rules: Rule[]): void => {
    if (!Array.isArray(rules) || rules.length === 0) {
        throw createValidationError('Rules must be a non-empty array', 'rules', rules)
    }
    
    rules.forEach((rule, index) => {
        if (!rule.cellColor || !rule.turnDirection) {
            throw createValidationError(`Rule at index ${index} missing required fields`, 'rules', rule)
        }
        
        validateColor(rule.cellColor)
        
        if (!['LEFT', 'RIGHT'].includes(rule.turnDirection)) {
            throw createValidationError(`Invalid turn direction at index ${index}`, 'rules', rule)
        }
    })

    const ruleColors = new Set(rules.map(rule => rule.cellColor))

    if (ruleColors.size !== rules.length) {
        throw createValidationError('Rules cannot have duplicate cell colors', 'rules', rules)
    }
}

export const safeJsonParse = <T>(jsonString: string, fallback: T): T => {
    try {
        return JSON.parse(jsonString) as T
    } catch {
        return fallback
    }
} 