import rewire from "rewire"
import React from "react"
import { shallow } from "enzyme"
import sinon from "sinon"
const ChatList = rewire("./ChatList")
const lastBotMessage = ChatList.__get__("lastBotMessage")
const sandbox = sinon.createSandbox()
const onUserInputSpy = sinon.spy()
const mockMessages = [
  { type: 'bot', content: 'first' },
  { type: 'user', content: 'second' },
  { type: 'option', content: [{ label: 'Texas', value: 'texas' }] },
]

describe('ChatList', () => {
  // run each test in isolation
  afterEach(() => sandbox.restore());

  // it('renders a ChatMessage component', () => {
  //   const component = shallow(<ChatList messages={mockMessages} onUserInput={onUserInputSpy} />);
  //   expect(component.find('div').text()).toEqual(expect.stringContaining('<ChatMessage />'));
  // });
  it('renders ChatMessage for each item in messages array', () => {
    const component = shallow(<ChatList messages={mockMessages} onUserInput={onUserInputSpy} />);
    expect(component.find('.chat-list').children()).toHaveLength(5);
  });
  it('renders ChatOptionList when type is option', () => {
    const component = shallow(<ChatList messages={mockMessages} onUserInput={onUserInputSpy} />);
    expect(component.find('.chat-list').text()).toEqual(expect.stringContaining('<ChatOptionList />'));
  });
});

// @ponicode
describe("lastBotMessage", () => {
    test("0", () => {
        let param2 = [["Wait time out reached, while waiting for results", "Could not find a grader object for message from xqueue", "No os dependencies found. "], ["Error:", "unexpected error", "Error:"], ["Error selecting from database", "Missing FileUri configuration", "New Error "]]
        let callFunction = () => {
            lastBotMessage(1, param2)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let param2 = [["Unknown error", "Warning: ", "Invalid Invitation Token."], ["Error:", "Internal Server Error\n", "Message recipient is not the grader, the person being graded, or the controller"], ["Uploaded file was not added to the resource. ", "An error occurred processing your request.", "Error:"]]
        let callFunction = () => {
            lastBotMessage(-5.48, param2)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let param2 = [["Could not find an existing submission in location.  rubric is original.", "Empty name specified", "Unknown error"], ["Sorry, This video cannot be accessed via this website", "Sorry, The video you are looking for does not exist.", "Error selecting from database"], ["cannot be found.", "Invalid [%s] value. %s", "Error getting key from: %s"]]
        let callFunction = () => {
            lastBotMessage(0, param2)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let param2 = [["To force deletion of the LAG use delete_force: True", "unexpected error", "Wait time out reached, while waiting for results"], ["The app does not exist", "<error_message>%s</error_message>", "Warning: "], ["No os dependencies found. ", "No updates are to be performed.", "Message originator is not the grader, or the person being graded"]]
        let callFunction = () => {
            lastBotMessage(0, param2)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let param2 = [["Exception not raised: %s", "Invalid data: No data found in any of the field(s)!!!", "No error"], ["ValueError exception should be raised", "Internal Server Error\n", "\n\nThe first error message:\n"], ["Could not find an existing submission in location.  rubric is original.", "\n\nThe first error message:\n", "Error:"]]
        let callFunction = () => {
            lastBotMessage(-100, param2)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction = () => {
            lastBotMessage(-Infinity, [])
        }
    
        expect(callFunction).not.toThrow()
    })
})
