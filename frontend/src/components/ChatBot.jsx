import React, { useState, useRef, useEffect } from 'react';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content:
        "Hello! 🎵 Welcome to TuneShare! I'm here to help you find the perfect instrument for rent. What can I assist you with today?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    instrument: '',
    rentDate: '',
    returnDate: '',
    address: '',
    conversationId: Date.now().toString(),
  });
  const [dataCollectionStep, setDataCollectionStep] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveEnquiryToDatabase = async (completeCustomerData = null) => {
    try {
      const dataToSave = completeCustomerData || customerData;

      const enquiryData = {
        customerData: dataToSave,
        messages: messages.map((msg) => ({
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
      };

      const response = await fetch('http://localhost:3000/api/enquiry/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enquiryData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            type: 'bot',
            content:
              '✅ Your inquiry has been successfully saved to our database! Our team will review your request and contact you soon at ' +
              (dataToSave.phone || '') +
              ' or ' +
              (dataToSave.email || '') +
              '. Thank you for choosing TuneShare! 🎵',
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error(data.message || 'Failed to save enquiry');
      }
    } catch (error) {
      console.error('Error saving enquiry to database:', error);

      setMessages((prev) => [
        ...prev,
        {
          type: 'bot',
          content:
            '⚠️ There was an issue saving your data to our database. Please contact our support team directly at +94 77 123 4567 or support@tuneshare.lk with your details. Error: ' +
            error.message,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Rule-based response system
  const generateBotResponse = (userMessage) => {
    const message = userMessage.toLowerCase();

    // Instrument availability responses
    if (message.includes('instrument') && (message.includes('available') || message.includes('rent'))) {
      return (
        'We have a fantastic selection of instruments available for rent! 🎸 Including:\n\n• Guitars (acoustic & electric)\n• Pianos & Keyboards\n• Drums & Percussion\n• Violins & String instruments\n• Wind instruments (saxophone, flute, trumpet)\n• Digital pianos\n\nWhat type of instrument interests you most?'
      );
    }

    // Pricing information
    if (message.includes('price') || message.includes('cost') || message.includes('how much')) {
      return (
        'Our rental rates are very competitive! 💰\n\n• Basic instruments: $15-25/day\n• Professional instruments: $30-50/day\n• Premium/rare instruments: $50-80/day\n\nRates include basic maintenance and pickup/delivery within city limits. Would you like a quote for a specific instrument?'
      );
    }

    // Booking/reservation process
    if (message.includes('book') || message.includes('reserve') || message.includes('rent') || message.includes('hire')) {
      if (!dataCollectionStep && !customerData.name) {
        setDataCollectionStep('name');
        return "Excellent! I'd love to help you with a booking. 📅 To get started, could you please tell me your name?";
      }
      return 'I can help you with that booking! Let me gather some information to process your request.';
    }

    // Return policy
    if (message.includes('return') && (message.includes('policy') || message.includes('rule'))) {
      return (
        'Our return policy is straightforward! 📋\n\n• Instruments must be returned in the same condition\n• Late returns incur additional daily charges\n• Damage assessment upon return\n• Full refund if cancelled 24+ hours in advance\n• Flexible extension options available\n\nNeed more details about any specific aspect?'
      );
    }

    // Location/delivery information
    if (message.includes('location') || message.includes('pickup') || message.includes('delivery')) {
      return (
        "We're conveniently located with flexible options! 🚚\n\n• Main locations: Colombo, Malabe, Avissawella, Matara\n• Free pickup/delivery within city limits\n• Extended delivery available for additional fee\n• Store pickup also available\n\nWhich location works best for you?"
      );
    }

    // Duration/rental period
    if (message.includes('how long') || message.includes('duration') || message.includes('period')) {
      return (
        'We offer flexible rental periods! ⏰\n\n• Minimum rental: 1 day\n• Weekly discounts available (7+ days)\n• Monthly packages for long-term needs\n• Same-day rental possible (subject to availability)\n\nHow long would you need the instrument?'
      );
    }

    // Instrument condition/quality
    if (message.includes('condition') || message.includes('quality') || message.includes('maintained')) {
      return (
        'All our instruments are professionally maintained! ✨\n\n• Regular maintenance by certified technicians\n• Quality inspection before each rental\n• Clean and sanitized instruments\n• Backup instruments available if issues arise\n• Insurance coverage included\n\nWe take pride in the condition of our instruments!'
      );
    }

    // Contact information
    if (message.includes('contact') || message.includes('phone') || message.includes('email')) {
      return (
        'Here are our contact details! 📞\n\n• Phone: +94 77 123 4567\n• Email: support@tuneshare.lk\n• WhatsApp: +94 77 123 4567\n• Live Chat: Right here! 😊\n\nWe\'re available 9 AM - 8 PM daily. How else can I help you?'
      );
    }

    // Specific instrument queries
    if (message.includes('guitar')) {
      return (
        'Great choice! We have excellent guitars available! 🎸\n\n• Acoustic guitars: $20-30/day\n• Electric guitars: $25-40/day\n• Classical guitars: $18-25/day\n• Bass guitars: $25-35/day\n\nAll include necessary accessories (picks, straps, etc.). Amps available for electric guitars. Which type interests you?'
      );
    }

    if (message.includes('piano') || message.includes('keyboard')) {
      return (
        'Perfect! Our piano selection is wonderful! 🎹\n\n• Digital pianos: $30-45/day\n• Keyboards: $20-35/day\n• Stage pianos: $40-60/day\n\nAll include stands, pedals, and power supplies. Which would work best for your needs?'
      );
    }

    if (message.includes('drum')) {
      return (
        'Drums are so much fun! 🥁 We have:\n\n• Complete drum sets: $35-55/day\n• Electronic drums: $30-45/day\n• Individual drums: $10-20/day\n• Percussion instruments: $8-15/day\n\nIncludes sticks and basic hardware. Cymbals included with full sets!'
      );
    }

    if (message.includes('violin') || message.includes('string')) {
      return (
        'Beautiful choice! String instruments available: 🎻\n\n• Violins: $20-35/day\n• Violas: $25-40/day\n• Cellos: $35-50/day\n• Double bass: $45-65/day\n\nIncludes bow, rosin, and case. Different sizes available for students!'
      );
    }

    // Help/assistance
    if (message.includes('help') || message.includes('assist') || message.includes('support')) {
      return (
        "I'm here to help! 😊 Here's what I can assist you with:\n\n• Browse available instruments\n• Get pricing information\n• Make a booking/reservation\n• Answer policy questions\n• Provide contact details\n• Location & delivery info\n\nWhat would you like to know more about?"
      );
    }

    // Greeting responses
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return (
        "Hello there! 👋 Welcome to TuneShare! I'm excited to help you find the perfect instrument. Are you looking for something specific, or would you like to browse our available options?"
      );
    }

    // Thank you responses
    if (message.includes('thank') || message.includes('thanks')) {
      return (
        "You're very welcome! 😊 I'm happy to help. Is there anything else you'd like to know about our instruments or rental process?"
      );
    }

    // Default fallback response with suggestions
    const responses = [
      "I'd be happy to help you with that! Could you tell me more specifically what you're looking for? 🤔",
      "That's interesting! Are you looking for instrument availability, pricing, or booking information?",
      "I want to make sure I give you the best help possible! Could you clarify what you need assistance with?",
      "Let me help you with that! Are you interested in renting a specific instrument or learning about our services?",
    ];

    return (
      responses[Math.floor(Math.random() * responses.length)] +
      '\n\nI can help with:\n• Instrument availability\n• Pricing & booking\n• Policies & locations\n• Contact information'
    );
  };

  const simulateTyping = (response) => {
    setIsTyping(true);
    // Simulate realistic typing delay based on message length
    const typingDelay = Math.min(2000, Math.max(800, response.length * 20));

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          type: 'bot',
          content: response,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, typingDelay);
  };

  const handleDataCollection = (userMessage) => {
    let nextStep = null;
    let response = '';
    const updatedCustomerData = { ...customerData };

    switch (dataCollectionStep) {
      case 'name':
        updatedCustomerData.name = userMessage;
        setCustomerData(updatedCustomerData);
        response = `Great! Nice to meet you, ${userMessage}! 😊 Could you please provide your phone number?`;
        nextStep = 'phone';
        break;

      case 'phone':
        updatedCustomerData.phone = userMessage;
        setCustomerData(updatedCustomerData);
        response = `Perfect! And what's your email address?`;
        nextStep = 'email';
        break;

      case 'email':
        updatedCustomerData.email = userMessage;
        setCustomerData(updatedCustomerData);
        response = `Excellent! Which instrument would you like to rent? (e.g., guitar, piano, drums, violin, etc.)`;
        nextStep = 'instrument';
        break;

      case 'instrument':
        updatedCustomerData.instrument = userMessage;
        setCustomerData(updatedCustomerData);
        response = `${userMessage} - great choice! 🎵 When would you like to pick it up? (Please provide the date)`;
        nextStep = 'rentDate';
        break;

      case 'rentDate':
        updatedCustomerData.rentDate = userMessage;
        setCustomerData(updatedCustomerData);
        response = `Got it! And when would you like to return it?`;
        nextStep = 'returnDate';
        break;

      case 'returnDate':
        updatedCustomerData.returnDate = userMessage;
        setCustomerData(updatedCustomerData);
        response = `Perfect! Finally, could you provide your address for pickup/delivery coordination?`;
        nextStep = 'address';
        break;

      case 'address':
        updatedCustomerData.address = userMessage;
        setCustomerData(updatedCustomerData);
        response = `Wonderful! I have all your details. Let me save this information to our database. Our team will contact you shortly to confirm your ${updatedCustomerData.instrument} rental from ${updatedCustomerData.rentDate} to ${updatedCustomerData.returnDate}. Thank you for choosing TuneShare! 🎵✨`;
        nextStep = null;

        // Save the complete data to database with the updated data
        setTimeout(() => {
          saveEnquiryToDatabase(updatedCustomerData);
        }, 1000);
        break;

      default:
        break;
    }

    setDataCollectionStep(nextStep);
    simulateTyping(response);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setMessages((prev) => [
      ...prev,
      {
        type: 'user',
        content: userMessage,
        timestamp: new Date(),
      },
    ]);
    setInputMessage('');

    // Handle data collection steps
    if (dataCollectionStep) {
      handleDataCollection(userMessage);
    } else {
      // Generate rule-based response
      const response = generateBotResponse(userMessage);
      simulateTyping(response);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const predefinedQuestions = [
    'What instruments are available for rent?',
    'How much does it cost to rent?',
    'I want to make a booking',
    "What's your return policy?",
  ];

  const handleQuickQuestion = (question) => {
    setMessages((prev) => [
      ...prev,
      { type: 'user', content: question, timestamp: new Date() },
    ]);

    const response = generateBotResponse(question);
    simulateTyping(response);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 h-[500px] bg-white rounded-2xl shadow-2xl border-2 border-pink-200 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
            <div>
              <h3 className="font-semibold">TuneShare Support</h3>
              <p className="text-xs opacity-90">Online • Ready to help!</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-2xl whitespace-pre-line ${
                    message.type === 'user'
                      ? 'bg-pink-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length >= 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
              <div className="space-y-1">
                {predefinedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="w-full text-left text-xs bg-pink-50 hover:bg-pink-100 text-pink-700 px-2 py-1 rounded-lg transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white rounded-full p-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isOpen
            ? 'bg-gray-500 hover:bg-gray-600'
            : 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Notification Badge */}
      {!isOpen && messages.length > 1 && (
        <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
          !
        </div>
      )}
    </div>
  );
};

export default ChatBot;
