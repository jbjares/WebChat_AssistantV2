import React from 'react';
import ChatContainer from './ChatContainer/ChatContainer';
import SelectionSidebar from './SelectionSidebar/SelectionSidebar';
import OptionsSidebar from './OptionsSidebar/OptionsSidebar';
import { fetchMessage, executeClientAction, executeWorkspaceAction } from '../conversation';
import { IDLE, IN_PROGRESS, COMPLETED, FAILED } from '../constants';
import trackEvent from '../utils';

require('smoothscroll-polyfill').polyfill();

const parseNonGenericResponsesFromBotOutput = (genericObj) => {
  const responses = [];
  genericObj.forEach((response) => {
    if (response.response_type === 'title') {
      responses.push({
        type: 'bot',
        content: response.text,
      });
    } else if (response.response_type === 'option') {
      responses.push({
        type: 'bot',
        content: response.title,
      });

      let preference = 'text';
      if (response.preference !== undefined) {
        preference = response.preference;
      }

      const res = {
        type: 'option',
        display: 'list',
        content: response.options,
      };

      if (preference === 'button') {
        res.display = 'button';
      }
      responses.push(res);
    } else if (response.response_type === 'pause') {
      responses.push({
        type: response.response_type,
        time: response.time,
        typing: response.typing,
      });
    } else if (response.response_type === 'text') {
      if (response.text !== '') {
        responses.push({
          type: 'bot',
          content: response.text,
        });
      }
    } else if (response.response_type === 'image') {
      responses.push({
        type: 'image',
        content: response.source,
      });
    } else if (response.response_type === 'search') {
      responses.push({
        type: 'bot',
        content: response.header,
      });
      responses.push({
        type: response.response_type,
        content: response.results,
      });
    }
  });
  return responses;
};

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      messages: [],
      lastMessageJson: JSON.stringify({ test: 'hi' }),
      lastMessageContext: {},
      botMessageStatus: IDLE,
      paths: [
        {
          id: 1,
          label: 'Saudação',
          description: 'Utilize butões ou digite para conversar com nossa assistente virtual.',
          path: 'Oi, como você se chama?',
        },
        {
          id: 2,
          label: 'Book an Appointment',
          description: 'Provide the required information to schedule an appointment in a flexible, conversational manner.',
          path: 'I want to book an appointment',
        },
        {
          id: 3,
          label: 'Recommend a Credit Card',
          description: 'Describe your ideal credit card and receive a recommendation tailored to your preferences.',
          path: 'Can you help me choose a credit card?',
        },
      ],
      currentPath: 1,
      notificationText: '',
      notificationLink: null,
    };
  }

  componentDidMount() {
    // TODO: wrap in a settimeout of 0
    // this puts it within the event loop
    // so that rendering
    setTimeout(() => {
      this.routeToPath(this.state.paths[0]);
    }, 0);
  }

  displayNotification(notificationText, notificationLink = null) {
    this.setState({ notificationText });
    this.setState({ notificationLink });
  }

  updateChatList(messageObj) {
    const chatList = document.getElementById('chat-list');
    this.setState({ messages: [...this.state.messages, messageObj] }, () => {
      // only scroll when watson responds
      if (messageObj.type !== 'user') {
        setTimeout(() => {
          // scroll to bottom of #chat-list on each update
          chatList.scroll({ top: chatList.scrollHeight, behavior: 'smooth' });
          // IBM Firefox ignores previous scroll()
          // this works. uses scroll-behavior: smooth in css for smooth scrolling
          chatList.scrollTop = chatList.scrollHeight - chatList.clientHeight;
        }, 100);
      }
    });
  }

  iterateResponese(responses, index) {
    if (index < responses.length) {
      const res = responses[index];
      if (res.type !== 'pause') {
        this.updateChatList(res);
        this.iterateResponese(responses, index + 1);
      } else {
        const inputField = document.getElementById('input_field');
        if (res.typing) {
          inputField.placeholder = 'Sofia esta digitando...';
        }
        setTimeout(() => {
          inputField.placeholder = 'Digite aqui...';
          this.iterateResponese(responses, index + 1);
        }, res.time);
      }
    }
  }

  updateOptionsSidebar(lastMessageJson) {
    this.setState({ lastMessageJson });
  }

  updateConversationContext(lastMessageContext) {
    this.setState({ lastMessageContext });
  }

  updateMessageStatus(botMessageStatus) {
    this.setState({ botMessageStatus });
  }

  botMessageHandler(outputObj) {
    let isNotificationPresent = false;
    let responses = [];
    // check for chat options in generic options object
    if (outputObj.output.generic !== undefined) {
      responses = responses.concat(parseNonGenericResponsesFromBotOutput(outputObj.output.generic));
    }

    // execute client programmatic actions if they exist
    if (outputObj.output.actions
      && outputObj.output.actions.length > 0) {
      console.log(JSON.stringify(outputObj.actions, null, 2));
      const actions = outputObj.output.actions;
      actions.forEach((act) => {
        executeClientAction(act)
          .then((result) => {
            if (!outputObj.context.skip_user_input) {
              this.sendMessageToConversation(result.result, this.state.lastMessageContext);
            } else if (result.result === 'statement') {
              const action = executeWorkspaceAction({ statement_display: result.dates });
              responses.push(action);
            }
          });
      });
    }

    // execute standard workspace actions if they exist
    if (outputObj.output.user_defined !== undefined
      && outputObj.output.user_defined.action !== undefined) {
      const actionResponseArray = executeWorkspaceAction(outputObj.output.user_defined.action);

      actionResponseArray.forEach((actionResponse) => {
        if (actionResponse.type !== 'notification') {
          responses.push(actionResponse);
        } else {
          isNotificationPresent = true;
          this.displayNotification(actionResponse.text, actionResponse.link);
        }
      });
    }

    // execute standard workspace UI Action if they exist
    if (outputObj.output.user_defined !== undefined
      && outputObj.output.user_defined.ui_action !== undefined) {
      const actionResponseArray = executeWorkspaceAction(outputObj.output.user_defined.ui_action);

      actionResponseArray.forEach((actionResponse) => {
        if (actionResponse.type !== 'notification') {
          console.log(JSON.stringify(actionResponse));
          responses.push(actionResponse);
        } else {
          isNotificationPresent = true;
          this.displayNotification(actionResponse.text, actionResponse.link);
        }
      });
    }
    // serve notification if digression occured
    if (!isNotificationPresent && 'context' in outputObj && 'system' in outputObj.context && 'digressed' in outputObj.context.system) {
      this.displayNotification('The virtual assistant is able to answer an unrelated question and return back to the original flow using the Digressions feature.');
    }

    this.iterateResponese(responses, 0);
  }

  userMessageHandler(type, text) {
    trackEvent('Sent Message', 'TextInput', 'Chat TextInput');
    // do not accept empty inputs
    if (text.trim() !== '') {
      // add user message to state
      if (type !== 'option') {
        this.updateChatList({
          type: 'user',
          content: text,
        });
      }
      this.sendMessageToConversation(text, this.state.lastMessageContext);
    }
  }

  routeToPath(path) {
    trackEvent('Navigated to Panel', 'Button', 'NavButton');
    this.setState({ messages: [] });
    this.setState({ currentPath: path.id });
    this.setState({ lastMessageContext: {} });
    // send two requests to conversation chained together
    // the fetchMessage call clears the existing context
    // the sendMessageToConversation call sets the context to the selected
    // path
    fetchMessage('', null, (err, data) => {
      if (data) {
        this.updateConversationContext(data.context);
        this.sendMessageToConversation(path.path, this.state.lastMessageContext);
      }
    });
  }


  sendMessageToConversation(text, context = null) {
    this.updateMessageStatus(IN_PROGRESS);

    fetchMessage(text, context, (err, data) => {
      // data.code is set for an error response
      if (err || data.code !== undefined) {
        this.updateMessageStatus(FAILED);

        this.updateChatList({
          type: 'bot',
          content: 'Estou tendo problemas ao conectar ao servidor, por favor atualize a página.',
        });

        const errorMsg = (err) || data;

        throw new Error(errorMsg);
      }
      // update message status
      this.updateMessageStatus(COMPLETED);

      // render appropriate data
      this.botMessageHandler(data);

      // send stringified JSON to sidebar
      this.updateOptionsSidebar(JSON.stringify(data));

      // update context
      this.updateConversationContext(data.context);
    });
  }

  render() {
    return (
      <div className="ibm App">
        <SelectionSidebar
          onPathSelect={(path) => { this.routeToPath(path); }}
          paths={this.state.paths}
          currentPath={this.state.currentPath}
        />
        <ChatContainer
          messages={this.state.messages}
          chatOptions={this.state.chatOptions}
          onUserInput={(type, text) => { this.userMessageHandler(type, text); }}
          botMessageStatus={this.state.botMessageStatus}
        />
        <OptionsSidebar
          json={this.state.lastMessageJson}
          paths={this.state.paths}
          currentPath={this.state.currentPath}
          onPathSelect={(path) => { this.routeToPath(path); }}
          notificationText={this.state.notificationText}
          notificationLink={this.state.notificationLink}
        />
      </div>
    );
  }
}

export default App;
