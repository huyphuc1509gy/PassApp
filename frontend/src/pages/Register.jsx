import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container, Row, Col, Card, CardBody, CardTitle, Form, FormGroup,
    Label, Input, Button, Alert, Progress, FormText,
    Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap';
import zxcvbn from 'zxcvbn';
import api from '../api.jsx';
import { decryptVault, BackupKey, encryptVault, deriveKeys , generateRandomPin} from '../utils/crypto.js';

const Register = () => {
    const navigate = useNavigate();

    // State data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [pin, setPin] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [showPinModal, setShowPinModal] = useState(false);

    const handlePasswordChange = (e) => {
        const val = e.target.value;
        setPassword(val);
        if (val) {
            const result = zxcvbn(val);
            setScore(result.score);
            setFeedback(result.feedback.warning || result.feedback.suggestions[0] || "");
        } else {
            setScore(0);
            setFeedback("");
        }
    }

    const getProgressColor = () => {
        switch (score) {
            case 0: return "danger";
            case 1: return "danger";
            case 2: return "warning";
            case 3: return "info";
            case 4: return "success";
            default: return "secondary";
        }
    };

    // Handle Register , Get random PIN
    // Use pin to encrypt password -> backup
    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPass) {
            setError("Password and Retype are not same?");
            return; 
        }
        if (score < 2) {
            setError("Password is too weak");
            return;
        }

        setLoading(true);
        try {
            const randomPin = generateRandomPin();
            const { authKey, encKey } = deriveKeys(email, password); 
            console.log(randomPin)
            const BackupKeyHash = BackupKey(password, randomPin);
            const initVault = encryptVault([], encKey);

            await api.post('/auth/register', {
                email, authKey, BackupKeyHash, initVault
            });

            setPin(randomPin); 

            setShowPinModal(true);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed register");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowPinModal(false);
        navigate('/login');
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
            <Row className="w-100 justify-content-center">
                <Col xs={12} sm={10} md={8} lg={6} xl={5}>
                    <Card className="shadow-sm border-0 w-100" style={{ minWidth: "360px" }}>
                        <CardBody className="p-4">
                            <CardTitle tag="h3" className="text-center mb-4 text-primary">Register Account</CardTitle>

                            {error && <Alert color="danger" fade={false}>{error}</Alert>}

                            <Form onSubmit={handleRegister}>
                                <FormGroup>
                                    <Label for="email">Email</Label>
                                    <Input
                                        type="email" id="email" required
                                        placeholder="user@example.com"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <Label for="password">Master Password</Label>
                                    <Input
                                        type="password" id="password" required
                                        value={password} onChange={handlePasswordChange}
                                    />
                                    {password && (
                                        <div className="mt-2">
                                            <Progress value={(score + 1) * 20} color={getProgressColor()} style={{ height: "5px" }} />
                                            <FormText color={getProgressColor()}>
                                                Strength: {["Very Weak", "Weak", "Fair", "Strong", "Very Strong"][score]}
                                                {feedback && ` - ${feedback}`}
                                            </FormText>
                                        </div>
                                    )}
                                </FormGroup>

                                <FormGroup>
                                    <Label for="confirmPass">Confirm Password</Label>
                                    <Input
                                        type="password" id="confirmPass" required
                                        value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                                    />
                                </FormGroup>

                                <Button color="primary" block size="lg" disabled={loading} className="mt-3">
                                    {loading ? 'Creating keys & Registering...' : 'Create Account'}
                                </Button>
                            </Form>

                            <div className="text-center mt-3">
                                Already have an account? <Link to="/login" className="text-decoration-none">Login now</Link>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            {/* Modal show pin code */}
            <Modal isOpen={showPinModal} toggle={() => { }} backdrop="static" centered>
                <ModalHeader className="bg-success text-white">Registration Successful! 🎉</ModalHeader>
                <ModalBody className="text-center">
                    <p>Your account has been created.</p>
                    <p className="fw-bold text-danger">HERE IS YOUR RECOVERY PIN:</p>

                    <div className="display-4 font-monospace border p-3 bg-light rounded text-primary my-3">
                        {pin}
                    </div>

                    <Alert color="warning" className="text-start" style={{ fontSize: '14px' }} fade={false}>
                        <strong>IMPORTANT NOTICE:</strong>
                        <ul className="mb-0 ps-3">
                            <li>We do <strong>NOT</strong> store this PIN.</li>
                            <li>If you forget your Master Password, this is the <strong>ONLY</strong> way to recover your data.</li>
                            <li>Please take a screenshot or write it down immediately.</li>
                        </ul>
                    </Alert>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" block onClick={handleCloseModal}>
                        Pin is stored ! Go to Login
                    </Button>
                </ModalFooter>
            </Modal>
        </Container>
    )
}
export default Register;