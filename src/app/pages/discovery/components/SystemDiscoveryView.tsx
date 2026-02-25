import { useState, useRef } from 'react';
import type { Component } from '@/app/types';
import { 
  CheckCircle, 
  AlertTriangle, 
  Cpu, 
  Radio, 
  Zap, 
  Eye, 
  Wifi,
  Gauge,
  Car,
  Home,
  Sparkles,
  Package,
  ShieldAlert,
  MessageSquare,
  Upload,
  FileText,
  Send,
  Paperclip,
  X,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '@/app/context/SessionContext';

interface SystemDiscoveryViewProps {
  components: Component[];
  onDiscoveryComplete: (systemType: string, validatedComponents: Component[]) => void;
}

interface SystemTypeOption {
  id: string;
  name: string;
  icon: any;
  confidence: number;
  description: string;
  typicalComponents: string[];
  color: string;
}

interface Anomaly {
  id: string;
  severity: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  affectedComponents?: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  fileAttachment?: {
    name: string;
    size: number;
  };
}

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
}

// System type detection based on BOM analysis - Always returns multiple options
const detectSystemTypes = (components: Component[]): SystemTypeOption[] => {
  const types = components.map(c => c.type.toLowerCase());
  const refs = components.map(c => c.reference.toLowerCase());
  
  // Detection logic based on component patterns
  const hasIMU = types.some(t => t.includes('imu') || t.includes('gyro') || t.includes('accel'));
  const hasMotorDriver = types.some(t => t.includes('motor'));
  const hasBattery = refs.some(r => r.includes('bat') || r.includes('chrg'));
  const hasWiFi = types.some(t => t.includes('wifi') || t.includes('wireless'));
  const hasSensors = types.some(t => t.includes('sensor') || t.includes('barometer'));
  const hasMCU = types.some(t => t.includes('mcu') || t.includes('processor'));
  const hasRegulators = types.some(t => t.includes('regulator') || t.includes('ldo'));
  const hasCapacitors = types.some(t => t.includes('capacitor'));
  const hasResistors = types.some(t => t.includes('resistor'));
  
  const options: SystemTypeOption[] = [];
  
  // Calculate confidence scores based on component matches
  let droneScore = 0;
  let iotScore = 0;
  let powerScore = 0;
  let automotiveScore = 0;
  let smarthomeScore = 0;
  let medicalScore = 0;
  let industrialScore = 0;
  let telecomScore = 0;
  let embeddedScore = 0;
  
  // Drone/UAV scoring
  if (hasIMU) droneScore += 40;
  if (hasMotorDriver) droneScore += 35;
  if (hasBattery) droneScore += 15;
  if (hasSensors) droneScore += 10;
  droneScore = Math.min(droneScore, 95);
  
  // IoT Device scoring
  if (hasWiFi) iotScore += 35;
  if (hasSensors) iotScore += 30;
  if (hasMCU) iotScore += 15;
  if (hasRegulators) iotScore += 10;
  if (!hasMotorDriver) iotScore += 5;
  iotScore = Math.min(iotScore, 92);
  
  // Power Supply scoring
  if (hasRegulators) powerScore += 45;
  if (!hasIMU && !hasMotorDriver) powerScore += 20;
  if (hasCapacitors) powerScore += 15;
  powerScore = Math.min(powerScore, 85);
  
  // Automotive scoring
  if (hasMCU) automotiveScore += 25;
  if (hasRegulators) automotiveScore += 20;
  if (components.length > 25) automotiveScore += 15;
  if (hasSensors) automotiveScore += 10;
  automotiveScore = Math.min(automotiveScore, 78);
  
  // Smart Home scoring
  if (hasWiFi) smarthomeScore += 30;
  if (hasMCU) smarthomeScore += 25;
  if (!hasMotorDriver && !hasIMU) smarthomeScore += 15;
  smarthomeScore = Math.min(smarthomeScore, 82);
  
  // Medical Device scoring
  if (hasSensors) medicalScore += 25;
  if (hasMCU) medicalScore += 20;
  if (hasBattery) medicalScore += 15;
  medicalScore = Math.min(medicalScore, 75);
  
  // Industrial scoring
  if (hasMCU) industrialScore += 25;
  if (hasRegulators) industrialScore += 20;
  if (components.length > 20) industrialScore += 15;
  industrialScore = Math.min(industrialScore, 80);
  
  // Telecom scoring
  if (hasWiFi) telecomScore += 30;
  if (hasMCU) telecomScore += 20;
  if (hasRegulators) telecomScore += 15;
  telecomScore = Math.min(telecomScore, 77);
  
  // Embedded scoring (fallback)
  if (hasMCU) embeddedScore += 30;
  if (hasRegulators) embeddedScore += 20;
  embeddedScore = Math.min(embeddedScore, 65);
  
  // Add all options with scores above threshold (35%)
  if (droneScore >= 35) {
    options.push({
      id: 'drone',
      name: 'Drone / UAV Flight Controller',
      icon: Radio,
      confidence: droneScore,
      description: 'Unmanned aerial vehicle with flight control, motor drivers, and navigation sensors',
      typicalComponents: ['IMU', 'Motor Drivers', 'Battery Management', 'GPS', 'Telemetry'],
      color: 'blue'
    });
  }
  
  if (iotScore >= 35) {
    options.push({
      id: 'iot',
      name: 'IoT Sensor Device',
      icon: Wifi,
      confidence: iotScore,
      description: 'Internet-connected device with wireless communication and environmental sensors',
      typicalComponents: ['WiFi Module', 'Sensors', 'MCU', 'Power Management'],
      color: 'purple'
    });
  }
  
  if (powerScore >= 35) {
    options.push({
      id: 'power',
      name: 'Power Supply / Converter',
      icon: Zap,
      confidence: powerScore,
      description: 'Power conversion and regulation system',
      typicalComponents: ['Regulators', 'Buck/Boost Converters', 'Protection Circuits'],
      color: 'yellow'
    });
  }
  
  if (automotiveScore >= 35) {
    options.push({
      id: 'automotive',
      name: 'Automotive Control Module',
      icon: Car,
      confidence: automotiveScore,
      description: 'Vehicle control system with robust power and communication',
      typicalComponents: ['MCU', 'CAN Transceivers', 'Power Management', 'Sensors'],
      color: 'green'
    });
  }
  
  if (smarthomeScore >= 35) {
    options.push({
      id: 'smarthome',
      name: 'Smart Home Device',
      icon: Home,
      confidence: smarthomeScore,
      description: 'Connected home automation device with wireless control',
      typicalComponents: ['WiFi', 'MCU', 'User Interface', 'Power Supply'],
      color: 'indigo'
    });
  }
  
  if (medicalScore >= 35) {
    options.push({
      id: 'medical',
      name: 'Medical Device',
      icon: Eye,
      confidence: medicalScore,
      description: 'Healthcare monitoring or diagnostic system with sensors and data processing',
      typicalComponents: ['Sensors', 'MCU', 'Display', 'Battery'],
      color: 'red'
    });
  }
  
  if (industrialScore >= 35) {
    options.push({
      id: 'industrial',
      name: 'Industrial Control System',
      icon: Gauge,
      confidence: industrialScore,
      description: 'Process control, automation, or monitoring system for industrial applications',
      typicalComponents: ['MCU', 'Sensors', 'Power Management', 'Communication Interfaces'],
      color: 'orange'
    });
  }
  
  if (telecomScore >= 35) {
    options.push({
      id: 'telecom',
      name: 'Telecommunications Device',
      icon: Radio,
      confidence: telecomScore,
      description: 'Communication infrastructure or network equipment',
      typicalComponents: ['RF Modules', 'MCU', 'Amplifiers', 'Power Management'],
      color: 'cyan'
    });
  }
  
  if (embeddedScore >= 35) {
    options.push({
      id: 'embedded',
      name: 'Generic Embedded System',
      icon: Cpu,
      confidence: embeddedScore,
      description: 'General purpose embedded electronic system',
      typicalComponents: ['MCU', 'Power Management', 'I/O Interfaces'],
      color: 'gray'
    });
  }
  
  // Ensure we always have at least 3 options - add generic ones if needed
  if (options.length < 3) {
    const genericOptions = [
      {
        id: 'consumer',
        name: 'Consumer Electronics',
        icon: Package,
        confidence: 60,
        description: 'Consumer electronic device for personal or household use',
        typicalComponents: ['MCU', 'User Interface', 'Power Supply', 'Connectivity'],
        color: 'pink'
      },
      {
        id: 'embedded',
        name: 'Generic Embedded System',
        icon: Cpu,
        confidence: 55,
        description: 'General purpose embedded electronic system',
        typicalComponents: ['MCU', 'Power Management', 'I/O Interfaces'],
        color: 'gray'
      },
      {
        id: 'prototype',
        name: 'Development/Prototype Board',
        icon: Sparkles,
        confidence: 50,
        description: 'Development platform or prototype system for testing and experimentation',
        typicalComponents: ['MCU', 'Debug Interfaces', 'Expansion Headers', 'Power'],
        color: 'teal'
      }
    ];
    
    // Add generic options that aren't already in the list
    for (const genOption of genericOptions) {
      if (!options.some(o => o.id === genOption.id) && options.length < 3) {
        options.push(genOption);
      }
    }
  }
  
  return options.sort((a, b) => b.confidence - a.confidence).slice(0, 6); // Return top 6
};

// Detect anomalies in BOM
const detectAnomalies = (components: Component[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const refs = components.map(c => c.reference);
  const types = components.map(c => c.type);
  
  // Check for duplicate references
  const duplicates = refs.filter((ref, idx) => refs.indexOf(ref) !== idx);
  if (duplicates.length > 0) {
    anomalies.push({
      id: 'duplicate-refs',
      severity: 'error',
      title: 'Duplicate Reference Designators',
      description: `Found ${duplicates.length} duplicate reference(s): ${duplicates.slice(0, 3).join(', ')}`,
      affectedComponents: duplicates
    });
  }
  
  // Check for missing part numbers
  const missingPartNumbers = components.filter(c => !c.partNumber || c.isGeneric);
  if (missingPartNumbers.length > 5) {
    anomalies.push({
      id: 'missing-parts',
      severity: 'warning',
      title: 'Generic Components Detected',
      description: `${missingPartNumbers.length} components lack specific part numbers and will need identification`,
      affectedComponents: missingPartNumbers.map(c => c.reference)
    });
  }
  
  // Check for power components
  const hasPowerReg = types.some(t => t.includes('regulator') || t.includes('ldo') || t.includes('buck'));
  if (!hasPowerReg && components.length > 10) {
    anomalies.push({
      id: 'no-power',
      severity: 'warning',
      title: 'No Power Regulators Found',
      description: 'Could not identify voltage regulators - verify power management components',
    });
  }
  
  // Check for MCU
  const hasMCU = types.some(t => t.includes('mcu') || t.includes('processor') || t.includes('microcontroller'));
  if (!hasMCU && components.length > 15) {
    anomalies.push({
      id: 'no-mcu',
      severity: 'info',
      title: 'No MCU Detected',
      description: 'No microcontroller found - this may be a subsystem or passive board',
    });
  }
  
  // Check component count
  if (components.length < 5) {
    anomalies.push({
      id: 'small-bom',
      severity: 'info',
      title: 'Small BOM',
      description: `Only ${components.length} components - verify upload completeness`,
    });
  }
  
  return anomalies;
};

// Component type distribution
const getComponentDistribution = (components: Component[]) => {
  const distribution: Record<string, number> = {};
  
  components.forEach(comp => {
    const category = comp.type.split('_')[0] || 'other';
    distribution[category] = (distribution[category] || 0) + 1;
  });
  
  return Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
};

export function SystemDiscoveryView({ components, onDiscoveryComplete }: SystemDiscoveryViewProps) {
  const { uploadData } = useSession();
  const systemTypes = detectSystemTypes(components);
  const [selectedSystemType, setSelectedSystemType] = useState<string>('');
  const [customSystemType, setCustomSystemType] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showAllSystems, setShowAllSystems] = useState(false);
  
  const anomalies = detectAnomalies(components);
  const componentDist = getComponentDistribution(components);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Chatbot state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your AI assistant.\n\nI've analyzed your BOM and found some AI-suggested system types on the left. **But you are the expert** - I'm here to help you make the decision!\n\n**Tell me about your system:**\n• What does this device do?\n• What's its primary function?\n• Any special requirements or constraints?\n\nYou can also click the 📎 paperclip below to upload specification documents, datasheets, or design files.",
      timestamp: new Date(),
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  
  // Document upload state
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  
  const selectedSystem = systemTypes.find(t => t.id === selectedSystemType);
  
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    
    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(chatInput, systemTypes),
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };
  
  const generateAIResponse = (input: string, types: SystemTypeOption[]): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('drone') || lowerInput.includes('uav') || lowerInput.includes('flight')) {
      return "Great! Based on your description, this sounds like a **Drone/UAV Flight Controller**.\n\nI can see in your BOM:\n✅ IMU sensors for flight stabilization\n✅ Motor drivers for ESC control\n✅ Battery management circuits\n\nThis matches the 'Drone / UAV Flight Controller' suggestion on the left (95% match).\n\nWould you like to select that option, or do you want to customize it further?";
    }
    if (lowerInput.includes('iot') || lowerInput.includes('sensor') || lowerInput.includes('monitor')) {
      return "Perfect! This appears to be an **IoT Sensor Device**.\n\nI notice in your BOM:\n✅ WiFi/wireless modules\n✅ Environmental sensors\n✅ Low-power MCU\n\nThis aligns with the 'IoT Sensor Device' suggestion (88% match).\n\nDoes this sound right? You can select it from the left panel or tell me more!";
    }
    if (lowerInput.includes('power') || lowerInput.includes('supply') || lowerInput.includes('converter')) {
      return "Got it! This sounds like a **Power Supply System**.\n\nYour BOM shows:\n✅ Multiple voltage regulators\n✅ Buck/boost converters\n✅ Protection circuits\n\nCheck out the 'Power Supply / Converter' option on the left.\n\nIs this your use case?";
    }
    
    return `Thanks for sharing! Based on your description and BOM analysis, here are my top suggestions:\n\n${types.slice(0, 2).map((t, i) => `${i + 1}. **${t.name}** (${t.confidence}% match)\n   ${t.description}`).join('\n\n')}\n\nYou can select one of these from the left panel, or tell me more so I can give better recommendations!`;
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const newDocs: UploadedDocument[] = Array.from(files).map(file => ({
      id: Date.now().toString() + file.name,
      name: file.name,
      type: file.type || 'unknown',
      size: file.size,
    }));
    
    setUploadedDocs(prev => [...prev, ...newDocs]);
    
    // Add file upload message to chat
    newDocs.forEach((doc, idx) => {
      setTimeout(() => {
        const fileMessage: ChatMessage = {
          id: Date.now().toString() + idx,
          role: 'user',
          content: `Uploaded file`,
          timestamp: new Date(),
          fileAttachment: {
            name: doc.name,
            size: doc.size,
          }
        };
        setChatMessages(prev => [...prev, fileMessage]);
      }, idx * 100);
    });
    
    // Simulate AI processing
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📄 I've analyzed **${newDocs[0].name}**!\n\n${
          newDocs[0].name.toLowerCase().includes('spec') || newDocs[0].name.toLowerCase().includes('requirement')
            ? '✅ Found specifications document\n✅ Detected high-performance control requirements\n✅ Identified safety-critical design constraints\n\nThis looks like a professional-grade system. The specifications support the drone controller classification.'
            : newDocs[0].name.toLowerCase().includes('schematic') || newDocs[0].name.toLowerCase().includes('pcb')
            ? '✅ Analyzed schematic/PCB layout\n✅ Verified component placement\n✅ Confirmed power distribution architecture\n\nThe hardware design aligns with your BOM structure!'
            : '✅ Document processed successfully\n✅ Additional context gathered\n✅ System understanding updated\n\nThis helps me better understand your design intent!'
        }`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    }, 1500);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleRemoveDoc = (docId: string) => {
    setUploadedDocs(prev => prev.filter(d => d.id !== docId));
  };
  
  const handleSystemTypeClick = (systemId: string) => {
    setSelectedSystemType(systemId);
    setShowCustomInput(false);
    
    // Add system message to chat
    const system = systemTypes.find(s => s.id === systemId);
    if (system) {
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: `Selected system type: **${system.name}**`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, systemMessage]);
    }
  };
  
  const handleProceed = () => {
    const finalSystemType = showCustomInput && customSystemType 
      ? customSystemType 
      : selectedSystem?.name || selectedSystemType;
    
    if (!finalSystemType) return;
    
    onDiscoveryComplete(finalSystemType, components);
  };
  
  const canProceed = (selectedSystemType && !showCustomInput) || (showCustomInput && customSystemType.trim());

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <MessageSquare className="h-12 w-12 mx-auto text-blue-500 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            System Discovery & Analysis
          </h1>
          <p className="text-lg text-gray-600">
            <strong>You decide</strong> what your system is - AI provides suggestions and insights
          </p>
        </motion.div>

        {/* BOM Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6 text-center">
            <Package className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <div className="text-3xl font-bold text-blue-600">
              {uploadData?.parts_count || components.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Parts</div>
          </div>
          <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <div className="text-3xl font-bold text-green-600">
              {uploadData?.total_quantity || components.filter(c => c.partNumber && !c.isGeneric).length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Quantity</div>
          </div>
          <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <div className="text-3xl font-bold text-yellow-600">
              {uploadData?.parts_preview?.length || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Preview Items</div>
          </div>
          <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-6 text-center">
            <Eye className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <div className="text-3xl font-bold text-purple-600">
              {uploadData?.parts_preview ? new Set(uploadData.parts_preview.map(p => p.manufacturer)).size : new Set(components.map(c => c.type)).size}
            </div>
            <div className="text-sm text-gray-600 mt-1">Unique Manufacturers</div>
          </div>
        </div>

        <div className="grid grid-cols-[450px_1fr] gap-8">
          {/* Left Column: System Type Suggestions (Reference Only) */}
          <div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-4 flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>AI Suggestions Only</strong> - These are recommendations based on component analysis. Use the chat to discuss and confirm your system type.
              </div>
            </div>
            
            <div className="space-y-3 mb-4">
              {(showAllSystems ? systemTypes : systemTypes.slice(0, 2)).map((system) => {
                const Icon = system.icon;
                const isSelected = selectedSystemType === system.id && !showCustomInput;
                
                return (
                  <motion.div
                    key={system.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleSystemTypeClick(system.id)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-lg ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2.5 ${isSelected ? 'bg-blue-500' : 'bg-gray-100'}`}>
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-bold text-sm text-gray-900">{system.name}</div>
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        
                        <div className={`text-xs font-medium px-2 py-0.5 rounded inline-block mb-2 ${
                          system.confidence >= 85 ? 'bg-green-100 text-green-700' : 
                          system.confidence >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {system.confidence}% match
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2">{system.description}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {system.typicalComponents.slice(0, 3).map((comp) => (
                            <span
                              key={comp}
                              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>

                        {/* Alternative Suggestions - At least 3 per system type */}
                        {system.confidence < 95 && (
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-1 mb-2">
                              <Info className="h-3 w-3 text-purple-600" />
                              <span className="text-xs font-semibold text-purple-700">Also consider:</span>
                            </div>
                            <div className="space-y-1.5">
                              {/* Generate 3+ alternative suggestions based on the system type */}
                              {system.id === 'drone' && (
                                <>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Robotics Control Platform</span>
                                    <span className="text-purple-600 font-medium">{Math.max(65, system.confidence - 12)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Autonomous Vehicle Controller</span>
                                    <span className="text-purple-600 font-medium">{Math.max(62, system.confidence - 15)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Motion Control System</span>
                                    <span className="text-purple-600 font-medium">{Math.max(58, system.confidence - 18)}%</span>
                                  </div>
                                </>
                              )}
                              {system.id === 'automotive' && (
                                <>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Industrial Control System</span>
                                    <span className="text-purple-600 font-medium">{Math.max(60, system.confidence - 15)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Heavy Machinery Controller</span>
                                    <span className="text-purple-600 font-medium">{Math.max(55, system.confidence - 20)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Transportation ECU</span>
                                    <span className="text-purple-600 font-medium">{Math.max(52, system.confidence - 22)}%</span>
                                  </div>
                                </>
                              )}
                              {system.id === 'iot' && (
                                <>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Smart Home Device</span>
                                    <span className="text-purple-600 font-medium">{Math.max(65, system.confidence - 10)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Sensor Network Node</span>
                                    <span className="text-purple-600 font-medium">{Math.max(60, system.confidence - 15)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Edge Computing Gateway</span>
                                    <span className="text-purple-600 font-medium">{Math.max(57, system.confidence - 18)}%</span>
                                  </div>
                                </>
                              )}
                              {system.id === 'medical' && (
                                <>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Wearable Health Monitor</span>
                                    <span className="text-purple-600 font-medium">{Math.max(70, system.confidence - 8)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Laboratory Equipment</span>
                                    <span className="text-purple-600 font-medium">{Math.max(65, system.confidence - 12)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Patient Monitoring System</span>
                                    <span className="text-purple-600 font-medium">{Math.max(62, system.confidence - 15)}%</span>
                                  </div>
                                </>
                              )}
                              {system.id === 'consumer' && (
                                <>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Smart Appliance</span>
                                    <span className="text-purple-600 font-medium">{Math.max(68, system.confidence - 10)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Portable Electronics</span>
                                    <span className="text-purple-600 font-medium">{Math.max(62, system.confidence - 15)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Personal Device</span>
                                    <span className="text-purple-600 font-medium">{Math.max(58, system.confidence - 18)}%</span>
                                  </div>
                                </>
                              )}
                              {system.id === 'industrial' && (
                                <>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Process Control Unit</span>
                                    <span className="text-purple-600 font-medium">{Math.max(72, system.confidence - 8)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Manufacturing Automation</span>
                                    <span className="text-purple-600 font-medium">{Math.max(67, system.confidence - 12)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Factory Floor Controller</span>
                                    <span className="text-purple-600 font-medium">{Math.max(63, system.confidence - 15)}%</span>
                                  </div>
                                </>
                              )}
                              {system.id === 'telecom' && (
                                <>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Network Infrastructure</span>
                                    <span className="text-purple-600 font-medium">{Math.max(70, system.confidence - 10)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Wireless Base Station</span>
                                    <span className="text-purple-600 font-medium">{Math.max(65, system.confidence - 15)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Communication Hub</span>
                                    <span className="text-purple-600 font-medium">{Math.max(60, system.confidence - 18)}%</span>
                                  </div>
                                </>
                              )}
                              {system.id === 'power' && (
                                <>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Battery Management System</span>
                                    <span className="text-purple-600 font-medium">{Math.max(68, system.confidence - 10)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">DC-DC Converter Module</span>
                                    <span className="text-purple-600 font-medium">{Math.max(64, system.confidence - 14)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Power Distribution Unit</span>
                                    <span className="text-purple-600 font-medium">{Math.max(60, system.confidence - 17)}%</span>
                                  </div>
                                </>
                              )}
                              {system.id === 'smarthome' && (
                                <>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Home Automation Hub</span>
                                    <span className="text-purple-600 font-medium">{Math.max(66, system.confidence - 10)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">IoT Appliance Controller</span>
                                    <span className="text-purple-600 font-medium">{Math.max(62, system.confidence - 14)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Connected Security Device</span>
                                    <span className="text-purple-600 font-medium">{Math.max(58, system.confidence - 17)}%</span>
                                  </div>
                                </>
                              )}
                              {system.id === 'embedded' && (
                                <>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Microcontroller Board</span>
                                    <span className="text-purple-600 font-medium">{Math.max(62, system.confidence - 10)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Data Acquisition System</span>
                                    <span className="text-purple-600 font-medium">{Math.max(58, system.confidence - 14)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-purple-50 rounded px-2 py-1">
                                    <span className="text-gray-700">Control Interface Module</span>
                                    <span className="text-purple-600 font-medium">{Math.max(54, system.confidence - 17)}%</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Show More/Less Button */}
            {systemTypes.length > 2 && (
              <button
                onClick={() => setShowAllSystems(!showAllSystems)}
                className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2 mb-4"
              >
                {showAllSystems ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show {systemTypes.length - 2} More System{systemTypes.length - 2 > 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}

            {/* Parts Preview */}
            {uploadData?.parts_preview && uploadData.parts_preview.length > 0 && (
              <div className="rounded-xl border-2 border-gray-200 bg-white p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-gray-900">Parts Preview</h3>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {uploadData.parts_preview.map((part, index) => (
                    <motion.div
                      key={`${part.part_number}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-semibold text-xs text-gray-900 truncate flex-1">
                          {part.part_number}
                        </div>
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium shrink-0">
                          <span>Qty:</span>
                          <span>{part.quantity}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {part.manufacturer}
                      </div>
                    </motion.div>
                  ))}
                </div>
                {uploadData.parts_count > uploadData.parts_preview.length && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500">
                      Showing {uploadData.parts_preview.length} of {uploadData.parts_count} parts
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Custom System Type Input */}
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4">
              {!showCustomInput ? (
                <button
                  onClick={() => {
                    setShowCustomInput(true);
                    setSelectedSystemType('');
                  }}
                  className="w-full text-center text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  <Cpu className="h-5 w-5 mx-auto mb-1" />
                  Define custom system type
                </button>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom System Description
                  </label>
                  <input
                    type="text"
                    value={customSystemType}
                    onChange={(e) => setCustomSystemType(e.target.value)}
                    placeholder="e.g., Medical Device Controller..."
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomSystemType('');
                    }}
                    className="mt-2 text-xs text-gray-600 hover:text-gray-900"
                  >
                    ← Back to suggestions
                  </button>
                </div>
              )}
            </div>

            {/* Component Distribution */}
            <div className="rounded-xl border-2 border-gray-200 bg-white p-4 mt-4">
              <h3 className="font-bold text-sm text-gray-900 mb-3">Component Distribution</h3>
              <div className="space-y-2">
                {componentDist.map(([type, count]) => {
                  const percentage = (count / components.length) * 100;
                  
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 capitalize">
                          {type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-600">
                          {count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="h-full bg-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Anomalies - Compact */}
            {anomalies.length > 0 && (
              <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 mt-4">
                <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-yellow-600" />
                  BOM Health Check
                </h3>
                <div className="space-y-1.5">
                  {anomalies.slice(0, 2).map((anomaly) => (
                    <div key={anomaly.id} className="text-xs">
                      <span className="font-medium text-gray-900">{anomaly.title}:</span>
                      <span className="text-gray-700 ml-1">{anomaly.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Conversational Chat (Primary Decision Interface) */}
          <div className="flex flex-col">
            {/* Uploaded Documents Bar */}
            <AnimatePresence>
              {uploadedDocs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 mb-4"
                >
                  <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Uploaded Documents ({uploadedDocs.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {uploadedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-2 rounded-lg bg-white border border-blue-200 px-3 py-1.5"
                      >
                        <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate max-w-[200px]">
                            {doc.name}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                        >
                          <X className="h-3 w-3 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Chatbot - Full Height */}
            <div className="rounded-xl border-2 border-gray-200 bg-white flex flex-col flex-1 min-h-[600px]">
              <div className="border-b p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Conversational System Analysis
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  <strong>You're in control.</strong> Describe your system, upload docs, and make the final decision.
                </p>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px]">
                {chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}
                  >
                    {msg.role === 'system' ? (
                      <div className="rounded-full bg-green-100 border border-green-200 px-4 py-1.5 text-xs text-green-800 font-medium">
                        ✓ {msg.content}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {msg.fileAttachment ? (
                          <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded p-2 mb-1">
                            <FileText className="h-4 w-4" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{msg.fileAttachment.name}</div>
                              <div className="text-xs opacity-75">{(msg.fileAttachment.size / 1024).toFixed(1)} KB</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        )}
                        <div
                          className={`text-xs mt-1 ${
                            msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              
              {/* Chat Input */}
              <div className="border-t p-4 bg-gray-50">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border-2 border-gray-300 p-2 text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title="Upload files"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Tell me about your system..."
                    className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    <span className="text-sm font-medium">Send</span>
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  Click paperclip to upload specs, datasheets, or design docs
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Proceed Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <button
            onClick={handleProceed}
            disabled={!canProceed}
            className="w-full rounded-xl bg-blue-500 px-6 py-5 text-white font-bold text-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
          >
            <CheckCircle className="h-6 w-6" />
            {canProceed
              ? `Proceed with ${showCustomInput ? customSystemType : selectedSystem?.name}`
              : 'Select or Define System Type to Continue'}
          </button>
          
          {canProceed && (
            <p className="text-center text-sm text-gray-600 mt-3">
              Your decision: <strong>{showCustomInput ? customSystemType : selectedSystem?.name}</strong> - This will configure the enrichment pipeline
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}